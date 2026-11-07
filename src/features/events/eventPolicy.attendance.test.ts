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
    state: null,
    cep: null,
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
const admin: Me = { ...volunteer, role: 'ADMIN', profileId: null, name: null, city: null }

const started = event({
  start: new Date(NOW.getTime() - HOUR).toISOString(),
  end: new Date(NOW.getTime() + 3 * HOUR).toISOString(),
})

function owner(e: EventView, me: Me | null) {
  return eventActions({ event: e, me, isRegistered: false, now: NOW }).owner
}

describe('eventActions: inscritos e presença', () => {
  it('só a ONG dona vê a lista de inscritos', () => {
    expect(owner(event(), ngo()).canSeeRegistrants).toBe(true)
    expect(owner(event(), ngo('ngo-2')).canSeeRegistrants).toBe(false)
    expect(owner(event(), volunteer).canSeeRegistrants).toBe(false)
    expect(owner(event(), admin).canSeeRegistrants).toBe(false)
    expect(owner(event(), null).canSeeRegistrants).toBe(false)
  })

  it('rascunho ainda não tem inscritos para mostrar', () => {
    expect(owner(event({ status: 'DRAFT' }), ngo()).canSeeRegistrants).toBe(false)
  })

  it('a lista continua visível em evento cancelado ou encerrado', () => {
    expect(owner(event({ status: 'CANCELLED' }), ngo()).canSeeRegistrants).toBe(true)
    expect(owner(event({ status: 'FINISHED' }), ngo()).canSeeRegistrants).toBe(true)
  })

  it('presença só depois do início e com o evento publicado, como no backend', () => {
    expect(owner(event(), ngo()).canRecordAttendance).toBe(false)
    expect(owner(started, ngo()).canRecordAttendance).toBe(true)
    expect(owner({ ...started, status: 'CANCELLED' }, ngo()).canRecordAttendance).toBe(false)
  })

  it('o instante do início já permite registrar presença', () => {
    const exactly = event({ start: NOW.toISOString(), end: new Date(NOW.getTime() + 2 * HOUR).toISOString() })

    expect(owner(exactly, ngo()).canRecordAttendance).toBe(true)
  })

  it('depois do fim, enquanto o evento não foi encerrado, a ONG ainda registra presença', () => {
    const ended = event({
      start: new Date(NOW.getTime() - 5 * HOUR).toISOString(),
      end: new Date(NOW.getTime() - HOUR).toISOString(),
    })

    expect(owner(ended, ngo()).canRecordAttendance).toBe(true)
  })

  it('outra ONG ou voluntário nunca registra presença', () => {
    expect(owner(started, ngo('ngo-2')).canRecordAttendance).toBe(false)
    expect(owner(started, volunteer).canRecordAttendance).toBe(false)
  })
})
