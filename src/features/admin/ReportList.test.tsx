import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReportView } from '../../lib/api/types'
import { ReportList } from './ReportList'

function report(overrides: Partial<ReportView> = {}): ReportView {
  return {
    reportId: 'rep-1',
    reporterId: 'acc-r',
    target: { type: 'POST', id: 'post-1' },
    reason: 'SPAM',
    targetSummary: 'Ganhe dinheiro rápido',
    details: 'Leva para link externo.',
    createdAt: new Date(2026, 10, 7, 14, 46).toISOString(),
    status: 'OPEN',
    ...overrides,
  }
}

function setup(reports: ReportView[], busyReportId: string | null = null) {
  const handlers = { onTakeDown: vi.fn(), onDismiss: vi.fn() }
  render(<ReportList reports={reports} busyReportId={busyReportId} {...handlers} />)
  return handlers
}

describe('ReportList', () => {
  it('mostra o conteúdo denunciado, o motivo e o que o denunciante disse', () => {
    setup([report()])

    expect(screen.getByText('Ganhe dinheiro rápido')).toBeInTheDocument()
    expect(screen.getByText('Spam')).toBeInTheDocument()
    expect(screen.getByText('Postagem')).toBeInTheDocument()
    expect(screen.getByText('7 nov, 14:46')).toBeInTheDocument()
    expect(screen.getByText(/Leva para link externo/)).toBeInTheDocument()
  })

  it('avisa quando o conteúdo denunciado já não existe', () => {
    setup([report({ targetSummary: null, details: null })])

    expect(screen.getByText('O conteúdo denunciado não existe mais.')).toBeInTheDocument()
  })

  it('remover o conteúdo pede confirmação', async () => {
    const handlers = setup([report()])

    await userEvent.click(screen.getByRole('button', { name: 'Remover postagem' }))
    expect(handlers.onTakeDown).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))

    expect(handlers.onTakeDown).toHaveBeenCalledWith(expect.objectContaining({ reportId: 'rep-1' }))
  })

  it('o verbo da ação segue o tipo do alvo: comentário é removido, conta é suspensa', () => {
    setup([
      report({ reportId: 'c', target: { type: 'COMMENT', id: 'c1' } }),
      report({ reportId: 'a', target: { type: 'ACCOUNT', id: 'a1' }, targetSummary: 'spam@x.com' }),
    ])

    expect(screen.getByRole('button', { name: 'Remover comentário' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suspender conta' })).toBeInTheDocument()
  })

  it('descartar encerra a denúncia sem tocar no conteúdo, sem pedir confirmação', async () => {
    const handlers = setup([report()])

    await userEvent.click(screen.getByRole('button', { name: 'Descartar denúncia' }))

    expect(handlers.onDismiss).toHaveBeenCalledWith(expect.objectContaining({ reportId: 'rep-1' }))
    expect(handlers.onTakeDown).not.toHaveBeenCalled()
  })

  it('bloqueia só a denúncia em andamento', () => {
    setup([report({ reportId: 'a' }), report({ reportId: 'b' })], 'a')

    const dismiss = screen.getAllByRole('button', { name: 'Descartar denúncia' })
    expect(dismiss[0]).toBeDisabled()
    expect(dismiss[1]).toBeEnabled()
  })
})
