/**
 * Contrato da API (Unnia-api). Mantenha alinhado com os controllers do backend: qualquer mudança nas
 * rotas ou nos DTOs de lá deve ser refletida aqui.
 */

export type Role = 'NGO' | 'VOLUNTEER' | 'ADMIN'

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED'

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

/** Resposta de login e de renovação de sessão. Datas em ISO 8601 (UTC). */
export interface SessionResponse {
  token: string
  expiresAt: string
  refreshToken: string
  refreshExpiresAt: string
  accountId: string
  role: Role
}

/** GET /api/me */
export interface Me {
  accountId: string
  email: string
  role: Role
  /** Id de ONG ou de voluntário, conforme o papel. Nulo para administradores. */
  profileId: string | null
  name: string | null
  city: string | null
  /** Só para ONGs. */
  verificationStatus: VerificationStatus | null
}

export interface EventView {
  eventId: string
  ownerId: string
  title: string
  description: string
  address: string
  city: string
  start: string
  end: string
  capacity: number
  occupiedSpots: number
  availableSpots: number
  status: EventStatus
}

export interface NgoProfile {
  ngoId: string
  name: string
  cnpj: string
  description: string
  city: string
  verificationStatus: VerificationStatus
}

export interface NewEventInput {
  title: string
  description: string
  address: string
  city: string
  /** ISO 8601 */
  start: string
  end: string
  capacity: number
}

export interface RegisterVolunteerInput {
  email: string
  password: string
  name: string
  bio: string
  city: string
}

export interface RegisterNgoInput {
  email: string
  password: string
  cnpj: string
  name: string
  description: string
  city: string
}
