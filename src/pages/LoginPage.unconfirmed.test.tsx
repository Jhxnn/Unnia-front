import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, problem } from '../test/helpers'

describe('login com e-mail ainda não confirmado', () => {
  let fetchMock: ReturnType<typeof mockFetch>

  beforeEach(() => {
    fetchMock = mockFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function renderLogin() {
    vi.resetModules()
    const { LoginPage } = await import('./LoginPage')
    const router = createMemoryRouter(
      [
        { path: '/entrar', element: <LoginPage /> },
        { path: '/confirme-seu-email', element: <p>Tela de confirmação</p> },
      ],
      { initialEntries: ['/entrar'] },
    )
    render(<RouterProvider router={router} />)
    return router
  }

  it('um 403 no login leva à tela de confirmação já com o e-mail digitado', async () => {
    fetchMock.mockResolvedValueOnce(problem(403, 'Confirme seu e-mail para entrar.'))
    const router = await renderLogin()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('E-mail'), ' maria@exemplo.com ')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/confirme-seu-email'))
    expect(router.state.location.search).toBe('?email=maria%40exemplo.com')
    expect(screen.getByText('Tela de confirmação')).toBeInTheDocument()
  })

  it('senha errada continua mostrando o erro na própria tela de login', async () => {
    fetchMock.mockResolvedValueOnce(problem(401, 'Credenciais inválidas'))
    const router = await renderLogin()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'errada1234')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entrar')
  })
})
