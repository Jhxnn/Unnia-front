import { describe, expect, it } from 'vitest'
import type { EventView, Me } from '../../lib/api/types'
import { eventActions, eventPhase } from './eventPolicy'

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

function ngo(verification: Me['verificationStatus'] = 'VERIFIED', profileId = 'ngo-1'): Me {
  return { ...volunteer, accountId: 'acc-n', role: 'NGO', profileId, verificationStatus: verification }
}

const admin: Me = { ...volunteer, role: 'ADMIN', profileId: null, name: null, city: null }

describe('eventPhase', () => {
  it('reflete o status do backend', () => {
    expect(eventPhase(event({ status: 'DRAFT' }), NOW)).toBe('draft')
    expect(eventPhase(event({ status: 'CANCELLED' }), NOW)).toBe('cancelled')
    expect(eventPhase(event({ status: 'FINISHED' }), NOW)).toBe('ended')
  })

  it('um evento publicado depende do relógio e das vagas', () => {
    expect(eventPhase(event(), NOW)).toBe('open')
    expect(eventPhase(event({ availableSpots: 0, occupiedSpots: 10 }), NOW)).toBe('full')
    expect(eventPhase(event({ start: new Date(NOW.getTime() - HOUR).toISOString() }), NOW)).toBe('ongoing')
    expect(
      eventPhase(
        event({ start: new Date(NOW.getTime() - 5 * HOUR).toISOString(), end: new Date(NOW.getTime() - HOUR).toISOString() }),
        NOW,
      ),
    ).toBe('ended')
  })

  it('o início conta como já começado, como no backend', () => {
    expect(eventPhase(event({ start: NOW.toISOString() }), NOW)).toBe('ongoing')
  })
})

describe('eventActions para visitantes e voluntários', () => {
  it('visitante é convidado a entrar enquanto há inscrições abertas', () => {
    const actions = eventActions({ event: event(), me: null, isRegistered: false, now: NOW })

    expect(actions.viewer).toBe('guest')
    expect(actions.register).toBe('login')
  })

  it('visitante não é convidado a entrar para um evento fechado', () => {
    expect(eventActions({ event: event({ status: 'CANCELLED' }), me: null, isRegistered: false, now: NOW }).register).toBe(
      'closed',
    )
  })

  it('voluntário se inscreve em evento aberto', () => {
    const actions = eventActions({ event: event(), me: volunteer, isRegistered: false, now: NOW })

    expect(actions.register).toBe('available')
    expect(actions.canCancelRegistration).toBe(false)
  })

  it('voluntário inscrito pode cancelar enquanto o evento não começou', () => {
    const actions = eventActions({ event: event(), me: volunteer, isRegistered: true, now: NOW })

    expect(actions.register).toBe('registered')
    expect(actions.canCancelRegistration).toBe(true)
  })

  it('voluntário inscrito em evento lotado ainda pode cancelar', () => {
    const full = event({ availableSpots: 0, occupiedSpots: 10 })

    expect(eventActions({ event: full, me: volunteer, isRegistered: true, now: NOW }).canCancelRegistration).toBe(true)
  })

  it('depois do início não dá mais para cancelar nem se inscrever', () => {
    const started = event({ start: new Date(NOW.getTime() - HOUR).toISOString() })

    expect(eventActions({ event: started, me: volunteer, isRegistered: true, now: NOW }).canCancelRegistration).toBe(false)
    expect(eventActions({ event: started, me: volunteer, isRegistered: false, now: NOW }).register).toBe('closed')
  })

  it('evento lotado mostra lotado para quem não está inscrito', () => {
    const full = event({ availableSpots: 0, occupiedSpots: 10 })

    expect(eventActions({ event: full, me: volunteer, isRegistered: false, now: NOW }).register).toBe('full')
  })
})

describe('eventActions para ONGs e administradores', () => {
  it('a ONG dona gerencia e não se inscreve', () => {
    const actions = eventActions({ event: event(), me: ngo(), isRegistered: false, now: NOW })

    expect(actions.viewer).toBe('owner')
    expect(actions.register).toBe('hidden')
    expect(actions.owner.canCancel).toBe(true)
  })

  it('outra ONG e administradores só visualizam', () => {
    const other = eventActions({ event: event(), me: ngo('VERIFIED', 'ngo-2'), isRegistered: false, now: NOW })
    const adminView = eventActions({ event: event(), me: admin, isRegistered: false, now: NOW })

    expect(other.viewer).toBe('other')
    expect(other.owner.canCancel).toBe(false)
    expect(adminView.viewer).toBe('other')
    expect(adminView.register).toBe('hidden')
  })

  it('só rascunhos podem ser publicados', () => {
    const draft = eventActions({ event: event({ status: 'DRAFT' }), me: ngo(), isRegistered: false, now: NOW })
    const published = eventActions({ event: event(), me: ngo(), isRegistered: false, now: NOW })

    expect(draft.owner.canPublish).toBe(true)
    expect(published.owner.canPublish).toBe(false)
  })

  it('ONG não verificada vê o rascunho mas a publicação fica bloqueada', () => {
    const pending = eventActions({ event: event({ status: 'DRAFT' }), me: ngo('PENDING'), isRegistered: false, now: NOW })
    const verified = eventActions({ event: event({ status: 'DRAFT' }), me: ngo('VERIFIED'), isRegistered: false, now: NOW })

    expect(pending.owner.canPublish).toBe(true)
    expect(pending.owner.publishBlockedByVerification).toBe(true)
    expect(verified.owner.publishBlockedByVerification).toBe(false)
  })

  it('encerrar só depois do fim, e só evento publicado', () => {
    const ended = event({ start: new Date(NOW.getTime() - 5 * HOUR).toISOString(), end: new Date(NOW.getTime() - HOUR).toISOString() })

    expect(eventActions({ event: ended, me: ngo(), isRegistered: false, now: NOW }).owner.canFinish).toBe(true)
    expect(eventActions({ event: event(), me: ngo(), isRegistered: false, now: NOW }).owner.canFinish).toBe(false)
    expect(eventActions({ event: { ...ended, status: 'FINISHED' }, me: ngo(), isRegistered: false, now: NOW }).owner.canFinish).toBe(false)
  })

  it('evento cancelado ou encerrado não pode mais ser cancelado', () => {
    expect(eventActions({ event: event({ status: 'CANCELLED' }), me: ngo(), isRegistered: false, now: NOW }).owner.canCancel).toBe(false)
    expect(eventActions({ event: event({ status: 'FINISHED' }), me: ngo(), isRegistered: false, now: NOW }).owner.canCancel).toBe(false)
  })
})
