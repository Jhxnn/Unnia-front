import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ToastProvider'
import { ApiError } from '../lib/api/errors'
import type { EventView, Me } from '../lib/api/types'

const HOUR = 3600_000

const state = vi.hoisted(() => ({
  me: null as Me | null,
  event: null as { isPending: boolean; isError: boolean; data: EventView | undefined } | null,
  update: vi.fn(),
  reschedule: vi.fn(),
  changeCapacity: vi.fn(),
}))

vi.mock('../features/auth/useMe', () => ({ useMe: () => ({ me: state.me, isLoading: false }) }))
vi.mock('../features/events/queries', async () => {
  const actual = await vi.importActual<typeof import('../features/events/queries')>('../features/events/queries')
  return { ...actual, useEvent: () => state.event }
})
vi.mock('../lib/api/endpoints', () => ({
  eventsApi: { update: state.update, reschedule: state.reschedule, changeCapacity: state.changeCapacity },
}))

import { EditEventPage } from './EditEventPage'

function event(overrides: Partial<EventView> = {}): EventView {
  return {
    eventId: 'event-1',
    ownerId: 'ngo-1',
    title: 'Mutirão',
    description: 'Triagem de doações',
    address: 'Rua A, 10',
    city: 'Recife',
    start: new Date(Date.now() + 48 * HOUR).toISOString(),
    end: new Date(Date.now() + 52 * HOUR).toISOString(),
    capacity: 10,
    occupiedSpots: 4,
    availableSpots: 6,
    status: 'PUBLISHED',
    ...overrides,
  }
}

const ngoMe: Me = {
  accountId: 'acc-n',
  email: 'n@x.com',
  role: 'NGO',
  profileId: 'ngo-1',
  name: 'Mãos',
  city: 'Recife',
  verificationStatus: 'VERIFIED',
}

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/ong/eventos/event-1/editar']}>
          <Routes>
            <Route path="/ong/eventos/:eventId/editar" element={<EditEventPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('EditEventPage', () => {
  beforeEach(() => {
    state.me = ngoMe
    state.event = { isPending: false, isError: false, data: event() }
    state.update.mockReset().mockResolvedValue(undefined)
    state.reschedule.mockReset().mockResolvedValue(undefined)
    state.changeCapacity.mockReset().mockResolvedValue(undefined)
  })

  it('mostra os detalhes atuais do evento para editar', () => {
    setup()

    const details = screen.getByRole('form', { name: 'Detalhes do evento' })
    expect(within(details).getByLabelText('Título')).toHaveValue('Mutirão')
    expect(within(details).getByLabelText('Endereço')).toHaveValue('Rua A, 10')
  })

  it('salvar os detalhes envia os dados aparados', async () => {
    setup()

    const details = screen.getByRole('form', { name: 'Detalhes do evento' })
    const title = within(details).getByLabelText('Título')
    await userEvent.clear(title)
    await userEvent.type(title, '  Mutirão de natal  ')
    await userEvent.click(within(details).getByRole('button', { name: 'Salvar detalhes' }))

    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith('event-1', {
        title: 'Mutirão de natal',
        description: 'Triagem de doações',
        address: 'Rua A, 10',
        city: 'Recife',
      }),
    )
    expect(await screen.findByText('Detalhes atualizados.')).toBeInTheDocument()
  })

  it('remarcar avisa quantas pessoas inscritas serão avisadas', () => {
    setup()

    expect(screen.getByText(/4 pessoas inscritas serão avisadas/)).toBeInTheDocument()
  })

  it('o fim precisa ser depois do início, e nada é enviado', async () => {
    setup()

    const schedule = screen.getByRole('form', { name: 'Horário do evento' })
    const end = within(schedule).getByLabelText('Fim')
    const start = within(schedule).getByLabelText('Início') as HTMLInputElement
    await userEvent.clear(end)
    await userEvent.type(end, start.value)
    await userEvent.click(within(schedule).getByRole('button', { name: 'Remarcar' }))

    expect(await screen.findByText('O fim precisa ser depois do início.')).toBeInTheDocument()
    expect(state.reschedule).not.toHaveBeenCalled()
  })

  it('mostra o motivo da recusa do servidor ao remarcar', async () => {
    state.reschedule.mockRejectedValue(new ApiError(422, 'O evento deve começar no futuro'))
    setup()

    await userEvent.click(within(screen.getByRole('form', { name: 'Horário do evento' })).getByRole('button', { name: 'Remarcar' }))

    expect(await screen.findByText('O evento deve começar no futuro')).toBeInTheDocument()
  })

  it('as vagas não podem ficar abaixo do número de inscritos', async () => {
    setup()

    const form = screen.getByRole('form', { name: 'Vagas do evento' })
    const capacity = within(form).getByLabelText('Vagas')
    await userEvent.clear(capacity)
    await userEvent.type(capacity, '3')
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar vagas' }))

    expect(await screen.findByText(/Já há 4 inscritos/)).toBeInTheDocument()
    expect(state.changeCapacity).not.toHaveBeenCalled()
  })

  it('aumentar as vagas envia o novo número', async () => {
    setup()

    const form = screen.getByRole('form', { name: 'Vagas do evento' })
    const capacity = within(form).getByLabelText('Vagas')
    await userEvent.clear(capacity)
    await userEvent.type(capacity, '25')
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar vagas' }))

    await waitFor(() => expect(state.changeCapacity).toHaveBeenCalledWith('event-1', 25))
  })

  it('com o evento em andamento, não oferece remarcar', () => {
    state.event = {
      isPending: false,
      isError: false,
      data: event({
        start: new Date(Date.now() - HOUR).toISOString(),
        end: new Date(Date.now() + 3 * HOUR).toISOString(),
      }),
    }
    setup()

    expect(screen.queryByRole('form', { name: 'Horário do evento' })).not.toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Vagas do evento' })).toBeInTheDocument()
  })

  it('outra ONG, ou um evento cancelado, recebe a explicação em vez do formulário', () => {
    state.me = { ...ngoMe, profileId: 'ngo-2' }
    setup()

    expect(screen.getByText('Este evento não pode ser editado')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Detalhes do evento' })).not.toBeInTheDocument()
  })

  it('evento cancelado não se edita', () => {
    state.event = { isPending: false, isError: false, data: event({ status: 'CANCELLED' }) }
    setup()

    expect(screen.getByText('Este evento não pode ser editado')).toBeInTheDocument()
  })
})
