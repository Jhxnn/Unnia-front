import { describe, expect, it } from 'vitest'
import type { EventView, Me } from '../../lib/api/types'
import { eventActions } from './eventPolicy'

const NOW = new Date('2026-11-10T12:00:00Z')
const HOUR = 3600_000

function event(overrides: Partial<EventView> = {}): EventView {
  return {
    eventId: 'event-1',
    ownerId: 'ngo-1',
    title: 'Mutirão',
    description: '',
    address: 'Rua A',
    city: 'Recife',
    start: new Date(NOW.getTime() + 48 * HOUR).toISOString(),
    end: new Date(NOW.getTime() + 52 * HOUR).toISOString(),
    capacity: 10,
    occupiedSpots: 3,
    availableSpots: 7,
    status: 'PUBLISHED',
    ...overrides,
  }
}

const volunteer: Me = {
  accountId: 'acc-v',
  email: 'v@x.com',
  role: 'VOLUNTEER',
  profileId: 'vol-1',
  name: 'Maria',
  city: 'Recife',
  verificationStatus: null,
}
const ngo = (profileId = 'ngo-1'): Me => ({ ...volunteer, accountId: 'acc-n', role: 'NGO', profileId, verificationStatus: 'VERIFIED' })

function owner(e: EventView, me: Me | null) {
  return eventActions({ event: e, me, isRegistered: false, now: NOW }).owner
}

describe('eventActions: editar e remarcar', () => {
  it('a ONG dona edita e remarca rascunhos e eventos que ainda não começaram', () => {
    expect(owner(event({ status: 'DRAFT' }), ngo()).canEdit).toBe(true)
    expect(owner(event({ status: 'DRAFT' }), ngo()).canReschedule).toBe(true)
    expect(owner(event(), ngo()).canEdit).toBe(true)
    expect(owner(event(), ngo()).canReschedule).toBe(true)
  })

  it('evento lotado ainda pode ser editado e remarcado', () => {
    const full = event({ occupiedSpots: 10, availableSpots: 0 })

    expect(owner(full, ngo()).canEdit).toBe(true)
    expect(owner(full, ngo()).canReschedule).toBe(true)
  })

  it('em andamento, edita detalhes e vagas, mas não remarca: o novo horário teria de ser no futuro', () => {
    const ongoing = event({
      start: new Date(NOW.getTime() - HOUR).toISOString(),
      end: new Date(NOW.getTime() + 3 * HOUR).toISOString(),
    })

    expect(owner(ongoing, ngo()).canEdit).toBe(true)
    expect(owner(ongoing, ngo()).canReschedule).toBe(false)
  })

  it('cancelado ou encerrado não se edita', () => {
    for (const status of ['CANCELLED', 'FINISHED'] as const) {
      expect(owner(event({ status }), ngo()).canEdit).toBe(false)
      expect(owner(event({ status }), ngo()).canReschedule).toBe(false)
    }
  })

  it('já terminado (mesmo sem ter sido encerrado) não se edita', () => {
    const over = event({
      start: new Date(NOW.getTime() - 5 * HOUR).toISOString(),
      end: new Date(NOW.getTime() - HOUR).toISOString(),
    })

    expect(owner(over, ngo()).canEdit).toBe(false)
  })

  it('só a ONG dona edita', () => {
    expect(owner(event(), ngo('ngo-2')).canEdit).toBe(false)
    expect(owner(event(), volunteer).canEdit).toBe(false)
    expect(owner(event(), null).canEdit).toBe(false)
  })
})
