import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NgoReview } from '../../lib/api/types'
import { NgoReviewList } from './NgoReviewList'

function ngo(overrides: Partial<NgoReview> = {}): NgoReview {
  return {
    ngoId: 'ngo-1',
    accountId: 'acc-1',
    name: 'Casa Viva',
    cnpj: '11.222.333/0001-81',
    description: 'Abrigo temporário para mulheres.',
    city: 'Olinda',
    email: 'casa@viva.org',
    verificationStatus: 'PENDING',
    accountStatus: 'ACTIVE',
    ...overrides,
  }
}

function setup(ngos: NgoReview[], busyNgoId: string | null = null) {
  const handlers = { onVerify: vi.fn(), onReject: vi.fn(), onSuspend: vi.fn(), onActivate: vi.fn() }
  render(<NgoReviewList ngos={ngos} busyNgoId={busyNgoId} {...handlers} />)
  return handlers
}

describe('NgoReviewList', () => {
  it('mostra o que o administrador precisa para decidir', () => {
    setup([ngo()])

    expect(screen.getByRole('heading', { name: 'Casa Viva' })).toBeInTheDocument()
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument()
    expect(screen.getByText('Olinda')).toBeInTheDocument()
    expect(screen.getByText('casa@viva.org')).toBeInTheDocument()
    expect(screen.getByText('Abrigo temporário para mulheres.')).toBeInTheDocument()
  })

  it('uma ONG pendente pode ser verificada com um clique', async () => {
    const handlers = setup([ngo()])

    await userEvent.click(screen.getByRole('button', { name: 'Verificar Casa Viva' }))

    expect(handlers.onVerify).toHaveBeenCalledWith(expect.objectContaining({ ngoId: 'ngo-1' }))
  })

  it('recusar pede confirmação antes de executar', async () => {
    const handlers = setup([ngo()])

    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(handlers.onReject).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar recusa' }))
    expect(handlers.onReject).toHaveBeenCalledWith(expect.objectContaining({ ngoId: 'ngo-1' }))
  })

  it('só oferece a decisão que ainda faz sentido para cada situação', () => {
    setup([
      ngo({ ngoId: 'v', name: 'Verificada', verificationStatus: 'VERIFIED' }),
      ngo({ ngoId: 'r', name: 'Recusada', verificationStatus: 'REJECTED' }),
    ])

    expect(screen.queryByRole('button', { name: 'Verificar Verificada' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar Recusada' })).toBeInTheDocument()
    // a recusada não pode ser recusada de novo: sobra um único "Recusar", o da verificada
    expect(screen.getAllByRole('button', { name: 'Recusar' })).toHaveLength(1)
  })

  it('conta suspensa aparece marcada e oferece reativar em vez de suspender', async () => {
    const handlers = setup([ngo({ accountStatus: 'SUSPENDED' })])

    expect(screen.getByText('Conta suspensa')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspender conta' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reativar conta' }))

    expect(handlers.onActivate).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acc-1' }))
  })

  it('suspender pede confirmação', async () => {
    const handlers = setup([ngo()])

    await userEvent.click(screen.getByRole('button', { name: 'Suspender conta' }))
    expect(handlers.onSuspend).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar suspensão' }))

    expect(handlers.onSuspend).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acc-1' }))
  })

  it('bloqueia os botões da ONG que está sendo processada, e só dela', () => {
    setup([ngo({ ngoId: 'a', name: 'Alfa' }), ngo({ ngoId: 'b', name: 'Beta' })], 'a')

    expect(screen.getByRole('button', { name: 'Verificar Alfa' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Verificar Beta' })).toBeEnabled()
  })
})
