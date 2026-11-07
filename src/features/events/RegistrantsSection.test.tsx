import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/errors'
import type { EventView, Me, Registrant } from '../../lib/api/types'

const state = vi.hoisted(() => ({
  me: null as Me | null,
  registrants: { isPending: false, isError: false, data: [] as Registrant[], error: null as unknown, refetch: vi.fn() },
  mutate: vi.fn(),
  enabledArg: undefined as boolean | undefined,
}))

vi.mock('../auth/useMe', () => ({ useMe: () => ({ me: state.me, isLoading: false }) }))
vi.mock('./queries', () => ({
  useRegistrants: (_eventId: string, enabled: boolean) => {
    state.enabledArg = enabled
    return state.registrants
  },
  useRecordAttendance: () => ({ mutate: state.mutate, isPending: false, variables: undefined }),
}))

import { RegistrantsSection } from './RegistrantsSection'

const HOUR = 3600_000
const ngoMe: Me = {
  accountId: 'acc-n',
  email: 'n@x.com',
  role: 'NGO',
  profileId: 'ngo-1',
  name: 'Mãos',
  city: 'Recife',
  verificationStatus: 'VERIFIED',
}
const volunteerMe: Me = { ...ngoMe, accountId: 'acc-v', role: 'VOLUNTEER', profileId: 'vol-1', verificationStatus: null }

function event(overrides: Partial<EventView> = {}): EventView {
  return {
    eventId: 'event-1',
    ownerId: 'ngo-1',
    title: 'Mutirão',
    description: '',
    address: 'Rua A',
    city: 'Recife',
    state: null,
    cep: null,
    start: new Date(Date.now() - HOUR).toISOString(),
    end: new Date(Date.now() + 3 * HOUR).toISOString(),
    capacity: 10,
    occupiedSpots: 1,
    availableSpots: 9,
    status: 'PUBLISHED',
    ...overrides,
  }
}

const maria: Registrant = {
  volunteerId: 'vol-1',
  name: 'Maria Souza',
  city: 'Recife',
  status: 'CONFIRMED',
  registeredAt: new Date().toISOString(),
}

describe('RegistrantsSection', () => {
  beforeEach(() => {
    state.me = ngoMe
    state.registrants = { isPending: false, isError: false, data: [maria], error: null, refetch: vi.fn() }
    state.mutate.mockReset()
    state.enabledArg = undefined
  })

  it('a ONG dona vê os inscritos e registra presença', async () => {
    render(<RegistrantsSection event={event()} />)

    expect(screen.getByRole('heading', { name: 'Inscritos' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar presença de Maria Souza' }))

    expect(state.mutate).toHaveBeenCalledWith('vol-1')
  })

  it('para voluntários não mostra nada e não pede a lista à API', () => {
    state.me = volunteerMe
    const { container } = render(<RegistrantsSection event={event()} />)

    expect(container).toBeEmptyDOMElement()
    expect(state.enabledArg).toBe(false)
  })

  it('para visitantes e outras ONGs também não', () => {
    state.me = null
    expect(render(<RegistrantsSection event={event()} />).container).toBeEmptyDOMElement()
    state.me = { ...ngoMe, profileId: 'ngo-2' }
    expect(render(<RegistrantsSection event={event()} />).container).toBeEmptyDOMElement()
    expect(state.enabledArg).toBe(false)
  })

  it('rascunho não tem a seção', () => {
    const { container } = render(<RegistrantsSection event={event({ status: 'DRAFT' })} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('enquanto carrega, avisa o que está buscando', () => {
    state.registrants = { ...state.registrants, isPending: true, data: [] }
    render(<RegistrantsSection event={event()} />)

    expect(screen.getByText('Buscando os inscritos…')).toBeInTheDocument()
  })

  it('se falhar, mostra o motivo e permite tentar de novo', async () => {
    state.registrants = { ...state.registrants, isError: true, data: [], error: new ApiError(500, 'O servidor falhou.') }
    render(<RegistrantsSection event={event()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('O servidor falhou.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(state.registrants.refetch).toHaveBeenCalled()
  })

  it('antes de o evento começar, mostra a lista sem botões de presença', () => {
    render(
      <RegistrantsSection
        event={event({
          start: new Date(Date.now() + 24 * HOUR).toISOString(),
          end: new Date(Date.now() + 28 * HOUR).toISOString(),
        })}
      />,
    )

    expect(screen.getByText('Maria Souza')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Registrar presença/ })).not.toBeInTheDocument()
  })
})
