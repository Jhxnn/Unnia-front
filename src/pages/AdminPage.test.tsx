import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NgoReview, ReportView, VerificationStatus } from '../lib/api/types'

function infinite<T>(items: T[]) {
  return {
    isPending: false,
    isError: false,
    error: null as unknown,
    data: { pages: [items] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }
}

const state = vi.hoisted(() => ({
  ngos: null as ReturnType<typeof infinite<NgoReview>> | null,
  reports: null as ReturnType<typeof infinite<ReportView>> | null,
  statusAsked: [] as VerificationStatus[],
  mutate: vi.fn(),
}))

vi.mock('../features/admin/queries', () => ({
  useNgoReviews: (status: VerificationStatus) => {
    state.statusAsked.push(status)
    return state.ngos
  },
  useOpenReports: () => state.reports,
  useAdminAction: () => ({ mutate: state.mutate, isPending: false, variables: undefined }),
}))

import { AdminPage } from './AdminPage'

const pendingNgo: NgoReview = {
  ngoId: 'ngo-1',
  accountId: 'acc-1',
  name: 'Casa Viva',
  cnpj: '11.222.333/0001-81',
  description: 'Abrigo.',
  city: 'Olinda',
  state: 'PE',
  email: 'casa@viva.org',
  verificationStatus: 'PENDING',
  accountStatus: 'ACTIVE',
}

const openReport: ReportView = {
  reportId: 'rep-1',
  reporterId: 'acc-r',
  target: { type: 'POST', id: 'post-1' },
  reason: 'SPAM',
  targetSummary: 'Compre seguidores',
  details: null,
  createdAt: new Date(2026, 10, 7, 14, 46).toISOString(),
  status: 'OPEN',
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AdminPage />
    </MemoryRouter>,
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    state.ngos = infinite([pendingNgo])
    state.reports = infinite([openReport])
    state.statusAsked = []
    state.mutate.mockReset()
  })

  it('abre na fila de ONGs pendentes', () => {
    renderAt('/admin')

    expect(screen.getByRole('heading', { name: 'Painel da equipe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ONGs' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Pendentes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Casa Viva' })).toBeInTheDocument()
    expect(state.statusAsked.at(-1)).toBe('PENDING')
  })

  it('trocar a situação busca a fila correspondente', async () => {
    renderAt('/admin')

    await userEvent.click(screen.getByRole('button', { name: 'Recusadas' }))

    expect(state.statusAsked.at(-1)).toBe('REJECTED')
    expect(screen.getByRole('button', { name: 'Recusadas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('a aba e a situação vêm da URL, então o link abre onde você estava', () => {
    renderAt('/admin?situacao=VERIFIED')
    expect(state.statusAsked.at(-1)).toBe('VERIFIED')

    renderAt('/admin?aba=denuncias')
    expect(screen.getByText('Compre seguidores')).toBeInTheDocument()
  })

  it('uma situação desconhecida na URL cai nas pendentes', () => {
    renderAt('/admin?situacao=QUALQUER')

    expect(state.statusAsked.at(-1)).toBe('PENDING')
  })

  it('a aba Denúncias mostra a fila de denúncias', async () => {
    renderAt('/admin')

    await userEvent.click(screen.getByRole('button', { name: 'Denúncias' }))

    expect(screen.getByText('Compre seguidores')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Casa Viva' })).not.toBeInTheDocument()
  })

  it('verificar uma ONG dispara a ação com a ONG escolhida', async () => {
    renderAt('/admin')

    await userEvent.click(screen.getByRole('button', { name: 'Verificar Casa Viva' }))

    expect(state.mutate).toHaveBeenCalledWith(expect.objectContaining({ ngoId: 'ngo-1' }))
  })

  it('fila vazia diz o que isso significa', () => {
    state.ngos = infinite<NgoReview>([])
    renderAt('/admin')

    expect(screen.getByText('Nenhuma ONG aguardando verificação.')).toBeInTheDocument()
  })

  it('sem denúncias abertas, explica quando elas aparecem', () => {
    state.reports = infinite<ReportView>([])
    renderAt('/admin?aba=denuncias')

    expect(screen.getByText('Nenhuma denúncia aberta')).toBeInTheDocument()
  })

  it('erro ao carregar oferece tentar de novo', async () => {
    const refetch = vi.fn()
    state.ngos = { ...infinite<NgoReview>([]), isError: true, error: new Error('falhou'), refetch }
    renderAt('/admin')

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(refetch).toHaveBeenCalled()
  })

  it('com mais páginas, oferece carregar mais', async () => {
    const fetchNextPage = vi.fn()
    state.ngos = { ...infinite([pendingNgo]), hasNextPage: true, fetchNextPage }
    renderAt('/admin')

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(fetchNextPage).toHaveBeenCalled()
  })
})
