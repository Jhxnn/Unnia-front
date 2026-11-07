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
  /** Conta da ONG: é o id que se usa para seguir, mandar mensagem e listar as publicações. */
  accountId: string
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

/** PUT /api/events/{id}: o que muda sem mexer em horário nem vagas. */
export interface EventDetailsInput {
  title: string
  description: string
  address: string
  city: string
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

// ---- social

export type ReactionType = 'LIKE' | 'LOVE' | 'SUPPORT'

export type AuthorRole = Role | 'UNKNOWN'

/** Quem escreveu um post ou comentário. `profileId` leva ao perfil público (ONG ou voluntário). */
export interface Author {
  name: string
  role: AuthorRole
  profileId: string | null
}

export interface MediaRef {
  url: string
  type: 'IMAGE' | 'VIDEO'
}

/** GET /api/posts/feed, /api/posts/{id}, /api/posts/author/{accountId} */
export interface PostView {
  postId: string
  authorId: string
  author: Author
  text: string
  media: MediaRef[]
  linkedEventId: string | null
  createdAt: string
  editedAt: string | null
  reactionCount: number
  commentCount: number
  /** A reação de quem consulta; nulo se ainda não reagiu. */
  myReaction: ReactionType | null
}

/** GET /api/posts/{id}/comments: comentário raiz com as respostas em um nível. */
export interface CommentView {
  commentId: string
  authorId: string
  author: Author
  text: string
  createdAt: string
  replies: CommentView[]
}

export interface FollowStatus {
  following: boolean
  followers: number
}

export interface PublishPostInput {
  text: string
  linkedEventId?: string
}

// ---- perfis

/** GET /api/ngos (vitrine das ONGs verificadas) */
export interface NgoCard {
  ngoId: string
  accountId: string
  name: string
  description: string
  city: string
}

/** GET /api/volunteers/{id} */
export interface VolunteerProfile {
  volunteerId: string
  accountId: string
  name: string
  bio: string
  city: string
}

export interface UpdateNgoInput {
  name: string
  description: string
  city: string
}

export interface UpdateVolunteerInput {
  name: string
  bio: string
  city: string
}

// ---- mensagens e notificações

/** GET /api/conversations */
export interface ConversationView {
  conversationId: string
  otherAccountId: string
  otherName: string
  lastActivityAt: string
  unreadCount: number
}

/** GET /api/conversations/{id}/messages (da mais nova para a mais antiga) */
export interface MessageView {
  messageId: string
  senderId: string
  text: string
  sentAt: string
  readAt: string | null
}

export type NotificationType =
  | 'VOLUNTEER_REGISTERED'
  | 'REGISTRATION_CANCELLED'
  | 'EVENT_CANCELLED'
  | 'EVENT_RESCHEDULED'
  | 'NEW_COMMENT'
  | 'NEW_REACTION'
  | 'NEW_FOLLOWER'
  | 'NEW_MESSAGE'
  | 'NGO_VERIFIED'
  | 'NGO_REJECTED'

/** GET /api/notifications. O que `referenceId` aponta depende do tipo. */
export interface NotificationView {
  notificationId: string
  type: NotificationType
  text: string
  referenceId: string | null
  createdAt: string
  read: boolean
}
