import type { EventView, Me } from '../../lib/api/types'

/** Em que ponto da vida o evento está, do ponto de vista de quem o vê. */
export type EventPhase = 'draft' | 'open' | 'full' | 'ongoing' | 'ended' | 'cancelled'

export function eventPhase(event: EventView, now: Date): EventPhase {
  if (event.status === 'CANCELLED') return 'cancelled'
  if (event.status === 'FINISHED') return 'ended'
  if (event.status === 'DRAFT') return 'draft'
  if (new Date(event.end) <= now) return 'ended'
  if (new Date(event.start) <= now) return 'ongoing'
  if (event.availableSpots <= 0) return 'full'
  return 'open'
}

export type Viewer = 'guest' | 'volunteer' | 'owner' | 'other'

/** O que o botão de inscrição deve mostrar. */
export type RegisterState =
  | 'hidden' // não se aplica a quem está vendo (ONG, administrador)
  | 'login' // visitante: precisa entrar
  | 'available'
  | 'registered' // já inscrito
  | 'full'
  | 'closed' // evento rascunho, em andamento, encerrado ou cancelado

export interface EventActions {
  viewer: Viewer
  register: RegisterState
  /** Só enquanto o evento não começou, como no backend. */
  canCancelRegistration: boolean
  owner: {
    canPublish: boolean
    /** Publicar exige ONG verificada; este campo explica por que o botão está bloqueado. */
    publishBlockedByVerification: boolean
    canCancel: boolean
    /** Detalhes e vagas mudam enquanto o evento não foi cancelado nem encerrado, como no backend. */
    canEdit: boolean
    /** Remarcar exige um novo horário no futuro, então não faz sentido com o evento em andamento. */
    canReschedule: boolean
    canFinish: boolean
    /** Só com o evento publicado e já iniciado, como no backend. */
    canRecordAttendance: boolean
    /** A lista de inscritos faz sentido a partir da publicação. */
    canSeeRegistrants: boolean
  }
}

interface Input {
  event: EventView
  me: Me | null
  isRegistered: boolean
  now: Date
}

export function eventActions({ event, me, isRegistered, now }: Input): EventActions {
  const phase = eventPhase(event, now)
  const isOwner = me?.role === 'NGO' && me.profileId === event.ownerId
  const viewer: Viewer = !me ? 'guest' : isOwner ? 'owner' : me.role === 'VOLUNTEER' ? 'volunteer' : 'other'

  const notStarted = phase === 'open' || phase === 'full'

  return {
    viewer,
    register: registerState(viewer, phase, isRegistered),
    canCancelRegistration: viewer === 'volunteer' && isRegistered && notStarted,
    owner: {
      canPublish: isOwner && phase === 'draft',
      publishBlockedByVerification: isOwner && phase === 'draft' && me?.verificationStatus !== 'VERIFIED',
      canCancel: isOwner && (phase === 'draft' || notStarted || phase === 'ongoing'),
      canEdit: isOwner && (phase === 'draft' || notStarted || phase === 'ongoing'),
      canReschedule: isOwner && (phase === 'draft' || notStarted),
      canFinish: isOwner && event.status === 'PUBLISHED' && new Date(event.end) <= now,
      canRecordAttendance: isOwner && event.status === 'PUBLISHED' && new Date(event.start) <= now,
      canSeeRegistrants: isOwner && phase !== 'draft',
    },
  }
}

function registerState(viewer: Viewer, phase: EventPhase, isRegistered: boolean): RegisterState {
  if (viewer === 'owner' || viewer === 'other') return 'hidden'
  if (viewer === 'guest') return phase === 'open' || phase === 'full' ? 'login' : 'closed'
  if (isRegistered) return 'registered'
  if (phase === 'open') return 'available'
  if (phase === 'full') return 'full'
  return 'closed'
}
