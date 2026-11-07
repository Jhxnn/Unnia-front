import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api/errors'

const state = vi.hoisted(() => ({ verify: vi.fn() }))

vi.mock('../lib/api/endpoints', () => ({ authApi: { verifyEmail: state.verify } }))

import { VerifyEmailPage } from './VerifyEmailPage'

function setup(url: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    state.verify.mockReset()
  })

  it('confirma com o token do link e convida a entrar', async () => {
    state.verify.mockResolvedValue(undefined)
    setup('/verificar-email?token=abc123')

    expect(await screen.findByText('E-mail confirmado')).toBeInTheDocument()
    expect(state.verify).toHaveBeenCalledWith('abc123')
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
  })

  it('enquanto confirma, mostra o andamento', () => {
    state.verify.mockReturnValue(new Promise(() => undefined))
    setup('/verificar-email?token=abc123')

    expect(screen.getByText('Confirmando seu e-mail…')).toBeInTheDocument()
  })

  it('link vencido ou usado mostra o motivo e oferece um novo link', async () => {
    state.verify.mockRejectedValue(new ApiError(422, 'Link de confirmação inválido ou expirado'))
    setup('/verificar-email?token=velho')

    expect(await screen.findByText('Não foi possível confirmar')).toBeInTheDocument()
    expect(screen.getByText('Link de confirmação inválido ou expirado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/confirme-seu-email')
  })

  it('sem token na URL, nem chama a API', () => {
    setup('/verificar-email')

    expect(screen.getByText('Link incompleto')).toBeInTheDocument()
    expect(state.verify).not.toHaveBeenCalled()
  })
})
