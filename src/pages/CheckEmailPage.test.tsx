import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ToastProvider'
import { ApiError } from '../lib/api/errors'

const state = vi.hoisted(() => ({ resend: vi.fn(), verify: vi.fn() }))

vi.mock('../lib/api/endpoints', () => ({
  authApi: { resendVerification: state.resend, verifyEmail: state.verify },
}))

import { CheckEmailPage, RESEND_WAIT_SECONDS } from './CheckEmailPage'

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>
}

function setup(url: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <Where />
          <Routes>
            <Route path="/confirme-seu-email" element={<CheckEmailPage />} />
            <Route path="/entrar" element={<p>Tela de entrar</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const WITH_EMAIL = '/confirme-seu-email?email=maria%40exemplo.com'

describe('CheckEmailPage', () => {
  beforeEach(() => {
    state.resend.mockReset().mockResolvedValue(undefined)
    state.verify.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('diz para qual e-mail o código foi enviado e pede os 6 números', () => {
    setup(WITH_EMAIL)

    expect(screen.getByText('maria@exemplo.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Código de confirmação')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail da conta')).not.toBeInTheDocument()
  })

  it('não existe link nem botão do tipo "já confirmei"', () => {
    setup(WITH_EMAIL)

    expect(screen.queryByText(/Já confirmei/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('só habilita confirmar com os 6 números', async () => {
    setup(WITH_EMAIL)
    const confirm = screen.getByRole('button', { name: 'Confirmar e-mail' })

    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Código de confirmação'), '48291')
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Código de confirmação'), '3')
    expect(confirm).toBeEnabled()
  })

  it('aceita só números e no máximo 6', async () => {
    setup(WITH_EMAIL)
    const field = screen.getByLabelText('Código de confirmação')

    await userEvent.type(field, '48a29-13999')

    expect(field).toHaveValue('482913')
  })

  it('confirmar envia o e-mail e o código, avisa e leva para entrar', async () => {
    setup(WITH_EMAIL)

    await userEvent.type(screen.getByLabelText('Código de confirmação'), '482913')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar e-mail' }))

    await waitFor(() => expect(state.verify).toHaveBeenCalledWith('maria@exemplo.com', '482913'))
    expect(await screen.findByText('Tela de entrar')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/entrar')
    expect(await screen.findByText('E-mail confirmado. Agora é só entrar.')).toBeInTheDocument()
  })

  it('código errado mostra o motivo no campo e fica na tela', async () => {
    state.verify.mockRejectedValue(new ApiError(422, 'Código inválido ou expirado'))
    setup(WITH_EMAIL)

    await userEvent.type(screen.getByLabelText('Código de confirmação'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar e-mail' }))

    expect(await screen.findByText('Código inválido ou expirado')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/confirme-seu-email')
  })

  it('reenviar chama a API com o e-mail da URL, limpa o código e avisa', async () => {
    setup(WITH_EMAIL)
    await userEvent.type(screen.getByLabelText('Código de confirmação'), '123')

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }))

    await waitFor(() => expect(state.resend).toHaveBeenCalledWith('maria@exemplo.com'))
    expect(await screen.findByText(/enviamos um código novo/)).toBeInTheDocument()
    expect(screen.getByLabelText('Código de confirmação')).toHaveValue('')
  })

  it('reenviar não confirma nada', async () => {
    setup(WITH_EMAIL)

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }))

    await waitFor(() => expect(state.resend).toHaveBeenCalled())
    expect(state.verify).not.toHaveBeenCalled()
  })

  it('depois de reenviar, o botão espera um minuto, como o servidor', async () => {
    setup(WITH_EMAIL)

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }))

    const waiting = await screen.findByRole('button', { name: /Reenviar em \d+ s/ })
    expect(waiting).toBeDisabled()
    expect(waiting.textContent).toContain(String(RESEND_WAIT_SECONDS))
  })

  it('o botão volta quando a espera acaba', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setup(WITH_EMAIL)

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }))
    await screen.findByRole('button', { name: /Reenviar em/ })
    await act(async () => {
      await vi.advanceTimersByTimeAsync((RESEND_WAIT_SECONDS + 1) * 1000)
    })

    expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled()
  })

  it('sem e-mail na URL, pede o e-mail e usa o digitado para confirmar e reenviar', async () => {
    setup('/confirme-seu-email')

    expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('E-mail da conta'), ' joao@exemplo.com ')
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }))
    await waitFor(() => expect(state.resend).toHaveBeenCalledWith('joao@exemplo.com'))
  })

  it('servidor de e-mail fora do ar: mostra o motivo e não inicia a espera', async () => {
    state.resend.mockRejectedValue(new ApiError(503, 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.'))
    setup(WITH_EMAIL)

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }))

    expect(await screen.findByText(/Não foi possível enviar o e-mail agora/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled()
  })
})
