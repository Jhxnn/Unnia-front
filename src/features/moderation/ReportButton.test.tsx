import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ToastProvider'
import { ApiError } from '../../lib/api/errors'

const state = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'anonymous',
  file: vi.fn(),
}))

vi.mock('../auth/useSession', () => ({ useSession: () => ({ status: state.status, session: null }) }))
vi.mock('../../lib/api/endpoints', () => ({ reportsApi: { file: state.file } }))

import { ReportButton } from './ReportButton'

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ToastProvider>
        <ReportButton targetType="POST" targetId="post-1" />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ReportButton', () => {
  beforeEach(() => {
    state.status = 'authenticated'
    state.file.mockReset()
  })

  it('visitantes não veem o botão: a API só aceita denúncia de quem está logado', () => {
    state.status = 'anonymous'
    setup()
    expect(screen.queryByRole('button', { name: 'Denunciar' })).not.toBeInTheDocument()
  })

  it('o botão abre o formulário com o motivo mais comum já escolhido', async () => {
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Denunciar' }))

    expect(screen.getByRole('combobox', { name: 'Motivo' })).toHaveValue('SPAM')
  })

  it('envia o motivo, o alvo e os detalhes, e avisa que a equipe vai analisar', async () => {
    state.file.mockResolvedValue({ reportId: 'r-1' })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Motivo' }), 'FRAUD')
    await userEvent.type(screen.getByLabelText('Detalhes (opcional)'), 'Parece golpe')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

    await waitFor(() => expect(state.file).toHaveBeenCalledWith('POST', 'post-1', 'FRAUD', 'Parece golpe'))
    expect(await screen.findByText('Denúncia enviada. A equipe vai analisar.')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Denunciar' })).not.toBeInTheDocument()
  })

  it('mostra o motivo da recusa da API, por exemplo denúncia repetida', async () => {
    state.file.mockRejectedValue(new ApiError(409, 'Você já denunciou este conteúdo', {}))
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

    expect(await screen.findByText('Você já denunciou este conteúdo')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Denunciar' })).toBeInTheDocument()
  })

  it('cancelar fecha o formulário sem enviar', async () => {
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(state.file).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Denunciar' })).toBeInTheDocument()
  })
})
