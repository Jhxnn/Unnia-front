import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authorizationOf, jsonResponse, mockFetch, problem, sessionBody } from '../../test/helpers'

type ClientModule = typeof import('./client')
type SessionModule = typeof import('./session')
type ErrorsModule = typeof import('./errors')

// carregado junto com o cliente: depois de resetModules, instanceof só vale entre módulos da mesma carga
let errors: ErrorsModule

/** Carrega módulos novos, para o estado inicial refletir o localStorage preparado pelo teste. */
async function load(): Promise<{ client: ClientModule; session: SessionModule }> {
  vi.resetModules()
  errors = await import('./errors')
  const session = await import('./session')
  const client = await import('./client')
  return { client, session }
}

function persist(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    'unnia.session',
    JSON.stringify({
      refreshToken: 'refresh-stored',
      refreshExpiresAt: Date.now() + 1e9,
      accountId: 'account-1',
      role: 'VOLUNTEER',
      ...overrides,
    }),
  )
}

interface Caught {
  status: number
  message: string
  fields: Record<string, string>
  retryAfterSeconds: number
}

describe('cliente da API', () => {
  let fetchMock: ReturnType<typeof mockFetch>

  beforeEach(() => {
    fetchMock = mockFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function signedIn(accessExpiresInMs = 15 * 60_000) {
    const { client, session } = await load()
    session.sessionStore.set(
      session.sessionFromResponse(
        sessionBody({ expiresAt: new Date(Date.now() + accessExpiresInMs).toISOString() }),
      ),
    )
    return { client, session }
  }

  describe('requisições', () => {
    it('envia o token de acesso e devolve o JSON', async () => {
      const { client } = await signedIn()
      fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

      const result = await client.request<{ ok: boolean }>('/api/me')

      expect(result).toEqual({ ok: true })
      expect(authorizationOf(fetchMock, 0)).toBe('Bearer access-1')
    })

    it('não envia token em rotas marcadas como públicas', async () => {
      const { client } = await signedIn()
      fetchMock.mockResolvedValueOnce(jsonResponse({}))

      await client.request('/api/auth/register/ngo', { method: 'POST', body: { a: 1 }, auth: false })

      expect(authorizationOf(fetchMock, 0)).toBeUndefined()
      expect(fetchMock.mock.calls[0]?.[1]?.body).toBe('{"a":1}')
    })

    it('monta a query string ignorando valores indefinidos', async () => {
      const { client } = await load()
      fetchMock.mockResolvedValueOnce(jsonResponse([]))

      await client.request('/api/events', { query: { page: 0, size: 12, city: undefined }, auth: false })

      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/events?page=0&size=12')
    })

    it('trata 204 como sucesso sem corpo', async () => {
      const { client } = await signedIn()
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      await expect(client.request('/api/events/1/publish', { method: 'POST' })).resolves.toBeUndefined()
    })
  })

  describe('erros', () => {
    it('converte Problem Details em ApiError, com os campos inválidos', async () => {
      const { client } = await load()
      fetchMock.mockResolvedValueOnce(problem(400, 'Dados inválidos', { fields: { email: 'deve ser um e-mail' } }))

      const error = await client.request<never>('/api/auth/login', { auth: false }).catch((e: unknown) => e as Caught)

      expect(error).toBeInstanceOf(errors.ApiError)
      expect(error.status).toBe(400)
      expect(error.message).toBe('Dados inválidos')
      expect(error.fields).toEqual({ email: 'deve ser um e-mail' })
    })

    it('429 vira RateLimitError com o tempo do Retry-After', async () => {
      const { client } = await load()
      fetchMock.mockResolvedValueOnce(problem(429, 'Muitas tentativas', {}, { 'Retry-After': '900' }))

      const error = await client.request<never>('/api/auth/login', { auth: false }).catch((e: unknown) => e as Caught)

      expect(error).toBeInstanceOf(errors.RateLimitError)
      expect(error.status).toBe(429)
      expect(error.retryAfterSeconds).toBe(900)
    })

    it('429 sem Retry-After assume uma espera padrão', async () => {
      const { client } = await load()
      fetchMock.mockResolvedValueOnce(problem(429, 'Muitas requisições'))

      const error = await client.request<never>('/api/events', { auth: false }).catch((e: unknown) => e as Caught)

      expect(error).toBeInstanceOf(errors.RateLimitError)
      expect(error.retryAfterSeconds).toBe(60)
    })

    it('usa uma mensagem em português quando o corpo não ajuda', async () => {
      const { client } = await load()
      fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 503 }))

      const error = await client.request<never>('/api/events', { auth: false }).catch((e: unknown) => e as Caught)

      expect(error.message).toBe('O servidor falhou. Tente novamente em instantes.')
    })

    it('falha de rede vira NetworkError', async () => {
      const { client } = await load()
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(client.request('/api/events', { auth: false })).rejects.toBeInstanceOf(errors.NetworkError)
    })
  })

  describe('renovação de sessão', () => {
    it('em 401 renova o token uma vez e repete a requisição', async () => {
      const { client, session } = await signedIn()
      fetchMock
        .mockResolvedValueOnce(problem(401, 'expirou'))
        .mockResolvedValueOnce(
          jsonResponse(sessionBody({ token: 'access-2', refreshToken: 'refresh-2' })),
        )
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      const result = await client.request<{ ok: boolean }>('/api/me')

      expect(result).toEqual({ ok: true })
      expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/refresh')
      expect(authorizationOf(fetchMock, 2)).toBe('Bearer access-2')
      expect(session.sessionStore.getState().session?.refreshToken).toBe('refresh-2')
      expect(JSON.parse(localStorage.getItem('unnia.session') ?? '{}').refreshToken).toBe('refresh-2')
    })

    it('várias requisições com 401 ao mesmo tempo disparam uma única renovação', async () => {
      const { client } = await signedIn()
      let refreshCalls = 0
      fetchMock.mockImplementation(async (input, init) => {
        if (String(input) === '/api/auth/refresh') {
          refreshCalls++
          return jsonResponse(sessionBody({ token: 'access-2', refreshToken: 'refresh-2' }))
        }
        const bearer = ((init?.headers ?? {}) as Record<string, string>).Authorization
        return bearer === 'Bearer access-2' ? jsonResponse({ ok: true }) : problem(401, 'expirou')
      })

      const results = await Promise.all([
        client.request('/api/me'),
        client.request('/api/events/mine'),
        client.request('/api/events/registered'),
      ])

      expect(results).toHaveLength(3)
      // o refresh token é de uso único: duas renovações com o mesmo token derrubariam a sessão
      expect(refreshCalls).toBe(1)
    })

    it('renova antes de enviar quando o token de acesso está para vencer', async () => {
      const { client } = await signedIn(5_000)
      fetchMock
        .mockResolvedValueOnce(jsonResponse(sessionBody({ token: 'access-2', refreshToken: 'refresh-2' })))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      await client.request('/api/me')

      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/refresh')
      expect(authorizationOf(fetchMock, 1)).toBe('Bearer access-2')
    })

    it('se a renovação é recusada, encerra a sessão e devolve o 401 original', async () => {
      const { client, session } = await signedIn()
      fetchMock.mockResolvedValueOnce(problem(401, 'expirou')).mockResolvedValueOnce(problem(401, 'Sessão inválida'))

      const error = await client.request<never>('/api/me').catch((e: unknown) => e as Caught)

      expect(error).toBeInstanceOf(errors.ApiError)
      expect(error.status).toBe(401)
      expect(session.sessionStore.getState().status).toBe('anonymous')
      expect(localStorage.getItem('unnia.session')).toBeNull()
    })

    it('sem rede na renovação, mantém o token guardado para tentar depois', async () => {
      const { client, session } = await signedIn()
      fetchMock.mockResolvedValueOnce(problem(401, 'expirou')).mockRejectedValueOnce(new TypeError('offline'))

      await expect(client.request('/api/me')).rejects.toMatchObject({ status: 401 })

      expect(localStorage.getItem('unnia.session')).not.toBeNull()
      expect(session.sessionStore.getState().status).toBe('authenticated')
    })

    it('usa o token de renovação mais recente do storage (outra aba pode tê-lo rotacionado)', async () => {
      const { client } = await signedIn()
      localStorage.setItem(
        'unnia.session',
        JSON.stringify({ refreshToken: 'refresh-da-outra-aba', refreshExpiresAt: Date.now() + 1e9, accountId: 'account-1', role: 'VOLUNTEER' }),
      )
      fetchMock
        .mockResolvedValueOnce(problem(401, 'expirou'))
        .mockResolvedValueOnce(jsonResponse(sessionBody({ token: 'access-2', refreshToken: 'refresh-3' })))
        .mockResolvedValueOnce(jsonResponse({}))

      await client.request('/api/me')

      expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ refreshToken: 'refresh-da-outra-aba' })
    })
  })

  describe('restaurar sessão ao abrir o app', () => {
    it('com token guardado e válido, volta autenticado', async () => {
      persist()
      const { client, session } = await load()
      expect(session.sessionStore.getState().status).toBe('restoring')
      fetchMock.mockResolvedValueOnce(jsonResponse(sessionBody({ token: 'access-9', refreshToken: 'refresh-9' })))

      await client.restoreSession()

      expect(session.sessionStore.getState().status).toBe('authenticated')
      expect(session.sessionStore.getState().session?.accessToken).toBe('access-9')
    })

    it('com token recusado, fica anônimo e limpa o storage', async () => {
      persist()
      const { client, session } = await load()
      fetchMock.mockResolvedValueOnce(problem(401, 'Sessão inválida ou expirada'))

      await client.restoreSession()

      expect(session.sessionStore.getState().status).toBe('anonymous')
      expect(localStorage.getItem('unnia.session')).toBeNull()
    })

    it('sem rede, fica anônimo mas preserva o token para a próxima visita', async () => {
      persist()
      const { client, session } = await load()
      fetchMock.mockRejectedValueOnce(new TypeError('offline'))

      await client.restoreSession()

      expect(session.sessionStore.getState().status).toBe('anonymous')
      expect(localStorage.getItem('unnia.session')).not.toBeNull()
    })

    it('sem nada guardado, já começa anônimo e não chama a API', async () => {
      const { client, session } = await load()

      await client.restoreSession()

      expect(session.sessionStore.getState().status).toBe('anonymous')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('uma requisição feita durante a restauração espera por ela', async () => {
      persist()
      const { client } = await load()
      fetchMock
        .mockResolvedValueOnce(jsonResponse(sessionBody({ token: 'access-9', refreshToken: 'refresh-9' })))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      await client.request('/api/me')

      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/refresh')
      expect(authorizationOf(fetchMock, 1)).toBe('Bearer access-9')
    })
  })

  describe('login e logout', () => {
    it('signIn guarda a sessão e persiste só o token de renovação', async () => {
      const { client, session } = await load()
      fetchMock.mockResolvedValueOnce(jsonResponse(sessionBody()))

      await client.signIn('maria@exemplo.com', 'senha1234')

      expect(session.sessionStore.getState().status).toBe('authenticated')
      const stored = localStorage.getItem('unnia.session') ?? ''
      expect(stored).toContain('refresh-1')
      expect(stored).not.toContain('access-1')
    })

    it('signOut limpa a sessão local e avisa o servidor', async () => {
      const { client, session } = await signedIn()
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      await client.signOut()

      expect(session.sessionStore.getState().status).toBe('anonymous')
      expect(localStorage.getItem('unnia.session')).toBeNull()
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/logout')
      expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ refreshToken: 'refresh-1' })
    })

    it('signOut sai mesmo se o servidor estiver fora do ar', async () => {
      const { client, session } = await signedIn()
      fetchMock.mockRejectedValueOnce(new TypeError('offline'))

      await expect(client.signOut()).resolves.toBeUndefined()

      expect(session.sessionStore.getState().status).toBe('anonymous')
    })
  })
})
