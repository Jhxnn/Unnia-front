import type { NotificationType } from '../../lib/api/types'

export interface RealtimeUpdate {
  type: NotificationType
  referenceId: string | null
}

type QueryPrefix = readonly string[]

/**
 * O que precisa ser buscado de novo quando chega um aviso. O servidor só diz "o que aconteceu"; aqui se decide
 * quais telas ficaram desatualizadas, para atualizar só essas e não a aplicação inteira.
 */
export function invalidationsFor(update: RealtimeUpdate): QueryPrefix[] {
  const keys: QueryPrefix[] = [['notifications']]
  switch (update.type) {
    case 'NEW_MESSAGE':
      keys.push(['messaging'])
      break
    case 'NEW_COMMENT':
    case 'NEW_REACTION':
      keys.push(['posts'])
      break
    case 'NEW_FOLLOWER':
      keys.push(['follow'])
      break
    case 'VOLUNTEER_REGISTERED':
    case 'REGISTRATION_CANCELLED':
    case 'EVENT_CANCELLED':
    case 'EVENT_RESCHEDULED':
      keys.push(['events'])
      break
    case 'NGO_VERIFIED':
    case 'NGO_REJECTED':
      // a situação da ONG aparece no menu e na lista de eventos dela
      keys.push(['me'], ['ngo'], ['events'])
      break
  }
  return keys
}

/** Ao (re)conectar, busca o que pode ter acontecido enquanto o canal estava fora. */
export const CATCH_UP: QueryPrefix[] = [['notifications'], ['messaging']]

/** Lê o corpo de um evento "update"; devolve nulo se vier algo que não seja o formato esperado. */
export function parseUpdate(data: string): RealtimeUpdate | null {
  try {
    const parsed = JSON.parse(data) as Partial<RealtimeUpdate>
    if (typeof parsed.type !== 'string') return null
    return { type: parsed.type as NotificationType, referenceId: parsed.referenceId ?? null }
  } catch {
    return null
  }
}
