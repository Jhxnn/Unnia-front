import { describe, expect, it } from 'vitest'
import type { NotificationType } from '../../lib/api/types'
import { CATCH_UP, invalidationsFor, parseUpdate } from './invalidations'

const keysFor = (type: NotificationType) => invalidationsFor({ type, referenceId: null }).map((key) => key.join('/'))

describe('invalidationsFor', () => {
  it('toda novidade atualiza as notificações', () => {
    const types: NotificationType[] = [
      'NEW_MESSAGE', 'NEW_COMMENT', 'NEW_REACTION', 'NEW_FOLLOWER', 'VOLUNTEER_REGISTERED',
      'REGISTRATION_CANCELLED', 'EVENT_CANCELLED', 'EVENT_RESCHEDULED', 'NGO_VERIFIED', 'NGO_REJECTED',
    ]
    for (const type of types) {
      expect(keysFor(type)).toContain('notifications')
    }
  })

  it('mensagem nova atualiza as conversas, e só elas além das notificações', () => {
    expect(keysFor('NEW_MESSAGE')).toEqual(['notifications', 'messaging'])
  })

  it('comentário e reação atualizam as postagens', () => {
    expect(keysFor('NEW_COMMENT')).toEqual(['notifications', 'posts'])
    expect(keysFor('NEW_REACTION')).toEqual(['notifications', 'posts'])
  })

  it('novo seguidor atualiza a contagem de seguidores', () => {
    expect(keysFor('NEW_FOLLOWER')).toEqual(['notifications', 'follow'])
  })

  it('inscrição, cancelamento e remarcação atualizam os eventos', () => {
    for (const type of ['VOLUNTEER_REGISTERED', 'REGISTRATION_CANCELLED', 'EVENT_CANCELLED', 'EVENT_RESCHEDULED'] as const) {
      expect(keysFor(type)).toEqual(['notifications', 'events'])
    }
  })

  it('a decisão sobre a ONG atualiza o perfil de quem está logado e os eventos', () => {
    expect(keysFor('NGO_VERIFIED')).toEqual(['notifications', 'me', 'ngo', 'events'])
  })

  it('ao reconectar, recupera notificações e mensagens', () => {
    expect(CATCH_UP.map((key) => key.join('/'))).toEqual(['notifications', 'messaging'])
  })
})

describe('parseUpdate', () => {
  it('lê o tipo e a referência', () => {
    expect(parseUpdate('{"type":"NEW_MESSAGE","referenceId":"abc"}')).toEqual({ type: 'NEW_MESSAGE', referenceId: 'abc' })
  })

  it('referência nula continua nula', () => {
    expect(parseUpdate('{"type":"NEW_FOLLOWER","referenceId":null}')).toEqual({ type: 'NEW_FOLLOWER', referenceId: null })
  })

  it('lixo não derruba o app: devolve nulo', () => {
    expect(parseUpdate('não é json')).toBeNull()
    expect(parseUpdate('{}')).toBeNull()
    expect(parseUpdate('{"type":5}')).toBeNull()
  })
})
