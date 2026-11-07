import { describe, expect, it } from 'vitest'
import type { NotificationType } from '../../lib/api/types'
import { notificationTarget } from './target'

const target = (type: NotificationType, referenceId: string | null = 'ref-1') =>
  notificationTarget({ type, referenceId })

describe('notificationTarget', () => {
  it('notificações de evento levam ao evento', () => {
    for (const type of ['VOLUNTEER_REGISTERED', 'REGISTRATION_CANCELLED', 'EVENT_CANCELLED', 'EVENT_RESCHEDULED'] as const) {
      expect(target(type)).toBe('/eventos/ref-1')
    }
  })

  it('comentário e reação levam à postagem', () => {
    expect(target('NEW_COMMENT')).toBe('/posts/ref-1')
    expect(target('NEW_REACTION')).toBe('/posts/ref-1')
  })

  it('mensagem leva à conversa', () => {
    expect(target('NEW_MESSAGE')).toBe('/mensagens/ref-1')
  })

  it('verificação da ONG leva aos eventos da ONG, mesmo sem referência', () => {
    expect(target('NGO_VERIFIED', null)).toBe('/ong/eventos')
    expect(target('NGO_REJECTED', null)).toBe('/ong/eventos')
  })

  it('novo seguidor não leva a lugar nenhum, pois o id é de conta e não há página para ele', () => {
    expect(target('NEW_FOLLOWER')).toBeNull()
  })

  it('sem referência, um tipo que depende dela não leva a lugar nenhum', () => {
    expect(target('NEW_COMMENT', null)).toBeNull()
    expect(target('EVENT_CANCELLED', null)).toBeNull()
  })
})
