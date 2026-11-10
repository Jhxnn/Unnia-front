import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, problem } from '../../test/helpers'

type Fetch = ReturnType<typeof mockFetch>

/** Módulos novos a cada teste, com uma sessão já guardada, para o cliente poder autenticar. */
async function load() {
  vi.resetModules()
  const { sessionStore } = await import('./session')
  sessionStore.set({
    accessToken: 'access-1',
    accessExpiresAt: Date.now() + 600_000,
    refreshToken: 'refresh-1',
    refreshExpiresAt: Date.now() + 86_400_000,
    accountId: 'acc-1',
    role: 'VOLUNTEER',
  })
  return import('./endpoints')
}

describe('envio de imagem', () => {
  let fetchMock: Fetch

  beforeEach(() => {
    fetchMock = mockFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda o arquivo como multipart, no campo "file", com o token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ url: 'https://cdn/a.png', type: 'IMAGE' }, { status: 201 }))
    const { mediaApi } = await load()
    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })

    const result = await mediaApi.upload(file)

    expect(result).toEqual({ url: 'https://cdn/a.png', type: 'IMAGE' })
    const [url, init] = fetchMock.mock.calls[0] ?? [undefined, undefined]
    expect(String(url)).toBe('/api/media')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    expect(((init?.body as FormData).get('file') as File).name).toBe('a.png')
    const headers = (init?.headers ?? {}) as Record<string, string>
    expect(headers.Authorization).toBe('Bearer access-1')
  })

  it('não fixa o Content-Type: o navegador precisa pôr o limite do multipart', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ url: 'u', type: 'IMAGE' }, { status: 201 }))
    const { mediaApi } = await load()

    await mediaApi.upload(new File(['x'], 'a.png', { type: 'image/png' }))

    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>
    expect(Object.keys(headers).map((key) => key.toLowerCase())).not.toContain('content-type')
  })

  it('mostra o motivo que a API devolve quando recusa o arquivo', async () => {
    fetchMock.mockResolvedValueOnce(problem(422, 'Formato não aceito. Use JPEG, PNG, WebP ou GIF'))
    const { mediaApi } = await load()

    await expect(mediaApi.upload(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow(
      'Formato não aceito. Use JPEG, PNG, WebP ou GIF',
    )
  })

  it('armazenamento não configurado (503) chega com a mensagem do servidor', async () => {
    fetchMock.mockResolvedValueOnce(problem(503, 'O envio de imagens ainda não está configurado.'))
    const { mediaApi } = await load()

    await expect(mediaApi.upload(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow(
      'O envio de imagens ainda não está configurado.',
    )
  })

  it('as outras chamadas continuam mandando JSON', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ postId: 'p-1' }, { status: 201 }))
    const { postsApi } = await load()

    await postsApi.publish({ text: 'Oi', media: [{ url: 'https://cdn/a.png', type: 'IMAGE' }] })

    const init = fetchMock.mock.calls[0]?.[1]
    expect(((init?.headers ?? {}) as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'Oi', media: [{ url: 'https://cdn/a.png', type: 'IMAGE' }] })
  })
})
