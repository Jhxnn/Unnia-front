import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, problem, sessionBody } from '../test/helpers'

type Fetch = ReturnType<typeof mockFetch>

/** Monta a tela de login numa rota de memória, com módulos novos para cada teste. */
async function renderLogin(fetchMock: Fetch, path = '/entrar') {
  vi.resetModules()
  const { LoginPage } = await import('./LoginPage')
  const router = createMemoryRouter(
    [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/', element: <p>Página inicial</p> },
      { path: '/eventos/42', element: <p>Evento 42</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  void fetchMock
  return router
}

async function fillAndSubmit(email = 'maria@exemplo.com', password = 'senha1234') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('tela de login', () => {
  let fetchMock: Fetch

  beforeEach(() => {
    fetchMock = mockFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('só habilita o botão com e-mail e senha preenchidos', async () => {
    await renderLogin(fetchMock)

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  })

  it('entra e vai para a página inicial', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sessionBody()))
    const router = await renderLogin(fetchMock)

    await fillAndSubmit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'maria@exemplo.com',
      password: 'senha1234',
    })
  })

  it('volta para a página que o usuário queria abrir', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sessionBody()))
    const router = await renderLogin(fetchMock, '/entrar?next=%2Feventos%2F42')

    await fillAndSubmit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/eventos/42'))
  })

  it('ignora um destino externo no parâmetro next', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sessionBody()))
    const router = await renderLogin(fetchMock, '/entrar?next=https%3A%2F%2Fmalicioso.com')

    await fillAndSubmit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('credenciais erradas mostram uma mensagem clara e não vazam qual campo errou', async () => {
    fetchMock.mockResolvedValueOnce(problem(401, 'Credenciais inválidas'))
    await renderLogin(fetchMock)

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('conta suspensa tem aviso próprio', async () => {
    fetchMock.mockResolvedValueOnce(problem(401, 'Conta suspensa'))
    await renderLogin(fetchMock)

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('suspensa')
  })

  it('bloqueio por excesso de tentativas diz quanto esperar', async () => {
    fetchMock.mockResolvedValueOnce(problem(429, 'Muitas tentativas de login.', {}, { 'Retry-After': '900' }))
    await renderLogin(fetchMock)

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('15 minutos')
  })

  it('falha de rede é explicada', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await renderLogin(fetchMock)

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('conexão')
  })
})
