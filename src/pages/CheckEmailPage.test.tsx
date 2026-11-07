import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ToastProvider'
import { ApiError } from '../lib/api/errors'

const state = vi.hoisted(() => ({ resend: vi.fn() }))

vi.mock('../lib/api/endpoints', () => ({ authApi: { resendVerification: state.resend } }))

import { CheckEmailPage, RESEND_WAIT_SECONDS } from './CheckEmailPage'

function setup(url: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <CheckEmailPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('CheckEmailPage', () => {
  beforeEach(() => {
    state.resend.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('diz para qual e-mail o link foi enviado', () => {
    setup('/confirme-seu-email?email=maria%40exemplo.com')

    expect(screen.getByText('maria@exemplo.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail da conta')).not.toBeInTheDocument()
  })

  it('reenviar chama a API com o e-mail da URL e avisa o resultado', async () => {
    setup('/confirme-seu-email?email=maria%40exemplo.com')

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    await waitFor(() => expect(state.resend).toHaveBeenCalledWith('maria@exemplo.com'))
    expect(await screen.findByText(/o link foi enviado de novo/)).toBeInTheDocument()
  })

  it('depois de reenviar, o botão espera um minuto, como o servidor', async () => {
    setup('/confirme-seu-email?email=maria%40exemplo.com')

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    const waiting = await screen.findByRole('button', { name: /Reenviar em \d+ s/ })
    expect(waiting).toBeDisabled()
    expect(waiting.textContent).toContain(String(RESEND_WAIT_SECONDS))
  })

  it('o botão volta quando a espera acaba', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setup('/confirme-seu-email?email=maria%40exemplo.com')

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))
    await screen.findByRole('button', { name: /Reenviar em/ })
    await act(async () => {
      await vi.advanceTimersByTimeAsync((RESEND_WAIT_SECONDS + 1) * 1000)
    })

    expect(screen.getByRole('button', { name: 'Reenviar e-mail' })).toBeEnabled()
  })

  it('sem e-mail na URL, pede o e-mail e só habilita o reenvio com ele preenchido', async () => {
    setup('/confirme-seu-email')

    const button = screen.getByRole('button', { name: 'Reenviar e-mail' })
    expect(button).toBeDisabled()
    await userEvent.type(screen.getByLabelText('E-mail da conta'), ' joao@exemplo.com ')
    expect(button).toBeEnabled()
    await userEvent.click(button)

    await waitFor(() => expect(state.resend).toHaveBeenCalledWith('joao@exemplo.com'))
  })

  it('servidor de e-mail fora do ar: mostra o motivo e não inicia a espera', async () => {
    state.resend.mockRejectedValue(new ApiError(503, 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.'))
    setup('/confirme-seu-email?email=maria%40exemplo.com')

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))

    expect(await screen.findByText(/Não foi possível enviar o e-mail agora/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reenviar e-mail' })).toBeEnabled()
  })

  it('oferece voltar para entrar', () => {
    setup('/confirme-seu-email?email=maria%40exemplo.com')

    expect(screen.getByRole('link', { name: 'Já confirmei: entrar' })).toHaveAttribute('href', '/entrar')
  })
})
