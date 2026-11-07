import type { NotificationView } from '../../lib/api/types'

/**
 * Para onde uma notificação leva. O que `referenceId` guarda depende do tipo: id de evento, de postagem,
 * de conversa ou da conta de quem seguiu. Quem seguiu não tem página que se alcance por esse id, então
 * a notificação não leva a lugar nenhum.
 */
export function notificationTarget(notification: Pick<NotificationView, 'type' | 'referenceId'>): string | null {
  const { type, referenceId } = notification
  switch (type) {
    case 'VOLUNTEER_REGISTERED':
    case 'REGISTRATION_CANCELLED':
    case 'EVENT_CANCELLED':
    case 'EVENT_RESCHEDULED':
      return referenceId ? `/eventos/${referenceId}` : null
    case 'NEW_COMMENT':
    case 'NEW_REACTION':
      return referenceId ? `/posts/${referenceId}` : null
    case 'NEW_MESSAGE':
      return referenceId ? `/mensagens/${referenceId}` : null
    case 'NGO_VERIFIED':
    case 'NGO_REJECTED':
      return '/ong/eventos'
    case 'NEW_FOLLOWER':
      return null
  }
}
