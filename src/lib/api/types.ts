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

export type RegistrationStatus = 'CONFIRMED' | 'ATTENDED'

/** GET /api/events/{id}/registrations (só a ONG dona). Inscrições ativas, da mais antiga para a mais nova. */
export interface Registrant {
  volunteerId: string
  name: string
  city: string
  status: RegistrationStatus
  registeredAt: string
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

export type AccountStatus = 'ACTIVE' | 'SUSPENDED'

/** GET /api/admin/ngos: fila de revisão de ONGs (só ADMIN). */
export interface NgoReview {
  ngoId: string
  accountId: string
  name: string
  cnpj: string
  description: string
  city: string
  email: string
  verificationStatus: VerificationStatus
  accountStatus: AccountStatus
}

export type ReportReason = 'SPAM' | 'ABUSE' | 'FRAUD' | 'INAPPROPRIATE_CONTENT' | 'OTHER'

export type ReportTargetType = 'POST' | 'COMMENT' | 'ACCOUNT'

export interface ReportTarget {
  type: ReportTargetType
  id: string
}

/** GET /api/admin/reports: denúncias abertas, da mais antiga para a mais nova (só ADMIN). */
export interface ReportView {
  reportId: string
  reporterId: string
  target: ReportTarget
  reason: ReportReason
  /** Trecho do conteúdo (ou e-mail da conta) denunciado; nulo se o conteúdo já não existe. */
  targetSummary: string | null
  details: string | null
  createdAt: string
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED'
}
