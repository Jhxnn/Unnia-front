import { request } from './client'
import type {
  CommentView,
  EventDetailsInput,
  ConversationView,
  EventView,
  FollowStatus,
  Me,
  MessageView,
  NewEventInput,
  NgoCard,
  NgoProfile,
  NgoReview,
  NotificationView,
  PostView,
  PublishPostInput,
  ReactionType,
  Registrant,
  RegisterNgoInput,
  RegisterVolunteerInput,
  ReportReason,
  ReportTargetType,
  ReportView,
  UpdateNgoInput,
  UpdateVolunteerInput,
  VerificationStatus,
  VolunteerProfile,
} from './types'

export const meApi = {
  get: () => request<Me>('/api/me'),
}

export const authApi = {
  registerVolunteer: (input: RegisterVolunteerInput) =>
    request<{ accountId: string; volunteerId: string }>('/api/auth/register/volunteer', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  registerNgo: (input: RegisterNgoInput) =>
    request<{ accountId: string; ngoId: string }>('/api/auth/register/ngo', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  /** Confirma o e-mail com o token do link recebido. Abrir o mesmo link de novo também dá certo. */
  verifyEmail: (token: string) =>
    request<void>('/api/auth/verify-email', { method: 'POST', body: { token }, auth: false }),
  /** Reenvia o link. A API responde igual exista a conta ou não. */
  resendVerification: (email: string) =>
    request<void>('/api/auth/resend-verification', { method: 'POST', body: { email }, auth: false }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/api/auth/password', { method: 'PUT', body: { currentPassword, newPassword } }),
}

export const eventsApi = {
  /** Eventos publicados que ainda não começaram, do mais próximo para o mais distante. */
  upcoming: (page: number, size: number, signal?: AbortSignal) =>
    request<EventView[]>('/api/events', { query: { page, size }, signal }),
  get: (eventId: string) => request<EventView>(`/api/events/${eventId}`),
  /** Todos os eventos da ONG autenticada, inclusive rascunhos. */
  mine: () => request<EventView[]>('/api/events/mine'),
  /** Eventos em que o voluntário autenticado tem inscrição ativa. */
  registered: () => request<EventView[]>('/api/events/registered'),
  create: (input: NewEventInput) => request<{ eventId: string }>('/api/events', { method: 'POST', body: input }),
  update: (eventId: string, input: EventDetailsInput) =>
    request<void>(`/api/events/${eventId}`, { method: 'PUT', body: input }),
  reschedule: (eventId: string, start: string, end: string) =>
    request<void>(`/api/events/${eventId}/schedule`, { method: 'PUT', body: { start, end } }),
  changeCapacity: (eventId: string, capacity: number) =>
    request<void>(`/api/events/${eventId}/capacity`, { method: 'PUT', body: { capacity } }),
  publish: (eventId: string) => request<void>(`/api/events/${eventId}/publish`, { method: 'POST' }),
  cancel: (eventId: string) => request<void>(`/api/events/${eventId}/cancel`, { method: 'POST' }),
  finish: (eventId: string) => request<void>(`/api/events/${eventId}/finish`, { method: 'POST' }),
  register: (eventId: string) => request<void>(`/api/events/${eventId}/registrations`, { method: 'POST' }),
  /** Quem está inscrito. Só a ONG dona do evento enxerga a lista. */
  registrants: (eventId: string) => request<Registrant[]>(`/api/events/${eventId}/registrations`),
  /** A ONG dona registra a presença de um voluntário inscrito; só vale depois do início do evento. */
  recordAttendance: (eventId: string, volunteerId: string) =>
    request<void>(`/api/events/${eventId}/attendance/${volunteerId}`, { method: 'POST' }),
  cancelRegistration: (eventId: string) =>
    request<void>(`/api/events/${eventId}/registrations`, { method: 'DELETE' }),
}

export const ngosApi = {
  get: (ngoId: string) => request<NgoProfile>(`/api/ngos/${ngoId}`),
}

export const adminApi = {
  /** Fila de revisão de ONGs por situação de verificação, em ordem alfabética. */
  ngos: (status: VerificationStatus, page: number, size: number, signal?: AbortSignal) =>
    request<NgoReview[]>('/api/admin/ngos', { query: { status, page, size }, signal }),
  verifyNgo: (ngoId: string) => request<void>(`/api/admin/ngos/${ngoId}/verify`, { method: 'POST' }),
  rejectNgo: (ngoId: string) => request<void>(`/api/admin/ngos/${ngoId}/reject`, { method: 'POST' }),
  suspendAccount: (accountId: string) => request<void>(`/api/admin/accounts/${accountId}/suspend`, { method: 'POST' }),
  activateAccount: (accountId: string) =>
    request<void>(`/api/admin/accounts/${accountId}/activate`, { method: 'POST' }),
  /** Denúncias abertas, da mais antiga para a mais nova. */
  reports: (page: number, size: number, signal?: AbortSignal) =>
    request<ReportView[]>('/api/admin/reports', { query: { page, size }, signal }),
  /** Encerra a denúncia como procedente; com takeDown, remove o conteúdo (ou suspende a conta). */
  resolveReport: (reportId: string, takeDown: boolean) =>
    request<void>(`/api/admin/reports/${reportId}/resolve`, { method: 'POST', body: { takeDown } }),
  dismissReport: (reportId: string) => request<void>(`/api/admin/reports/${reportId}/dismiss`, { method: 'POST' }),
}

export const postsApi = {
  /** Postagens da própria conta e de quem ela segue, da mais recente para a mais antiga. */
  feed: (page: number, size: number, signal?: AbortSignal) =>
    request<PostView[]>('/api/posts/feed', { query: { page, size }, signal }),
  get: (postId: string) => request<PostView>(`/api/posts/${postId}`),
  byAuthor: (accountId: string) => request<PostView[]>(`/api/posts/author/${accountId}`),
  publish: (input: PublishPostInput) => request<{ postId: string }>('/api/posts', { method: 'POST', body: input }),
  edit: (postId: string, text: string) => request<void>(`/api/posts/${postId}`, { method: 'PUT', body: { text } }),
  remove: (postId: string) => request<void>(`/api/posts/${postId}`, { method: 'DELETE' }),
  comments: (postId: string) => request<CommentView[]>(`/api/posts/${postId}/comments`),
  comment: (postId: string, text: string) =>
    request<{ commentId: string }>(`/api/posts/${postId}/comments`, { method: 'POST', body: { text } }),
  reply: (commentId: string, text: string) =>
    request<{ commentId: string }>(`/api/comments/${commentId}/replies`, { method: 'POST', body: { text } }),
  removeComment: (commentId: string) => request<void>(`/api/comments/${commentId}`, { method: 'DELETE' }),
  react: (postId: string, type: ReactionType) =>
    request<void>('/api/reactions', { method: 'PUT', body: { targetType: 'POST', targetId: postId, type } }),
  unreact: (postId: string) =>
    request<void>('/api/reactions', { method: 'DELETE', query: { targetType: 'POST', targetId: postId } }),
}

export const followsApi = {
  status: (accountId: string) => request<FollowStatus>(`/api/follows/${accountId}`),
  follow: (accountId: string) => request<void>(`/api/follows/${accountId}`, { method: 'POST' }),
  unfollow: (accountId: string) => request<void>(`/api/follows/${accountId}`, { method: 'DELETE' }),
}

export const reportsApi = {
  file: (targetType: ReportTargetType, targetId: string, reason: ReportReason, details: string) =>
    request<{ reportId: string }>('/api/reports', {
      method: 'POST',
      body: { targetType, targetId, reason, details: details.trim() || undefined },
    }),
}

export const profilesApi = {
  ngos: (page: number, size: number, signal?: AbortSignal) =>
    request<NgoCard[]>('/api/ngos', { query: { page, size }, signal }),
  volunteer: (volunteerId: string) => request<VolunteerProfile>(`/api/volunteers/${volunteerId}`),
  updateNgo: (input: UpdateNgoInput) => request<void>('/api/ngos/me', { method: 'PUT', body: input }),
  updateVolunteer: (input: UpdateVolunteerInput) => request<void>('/api/volunteers/me', { method: 'PUT', body: input }),
}

export const messagesApi = {
  conversations: () => request<ConversationView[]>('/api/conversations'),
  messages: (conversationId: string, page = 0, size = 50) =>
    request<MessageView[]>(`/api/conversations/${conversationId}/messages`, { query: { page, size } }),
  send: (recipientId: string, text: string) =>
    request<{ conversationId: string; messageId: string }>('/api/messages', {
      method: 'POST',
      body: { recipientId, text },
    }),
  markRead: (conversationId: string) =>
    request<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' }),
}

export const notificationsApi = {
  list: (page: number, size: number, signal?: AbortSignal) =>
    request<NotificationView[]>('/api/notifications', { query: { page, size }, signal }),
  unreadCount: () => request<{ count: number }>('/api/notifications/unread-count'),
  markRead: (notificationId: string) =>
    request<void>(`/api/notifications/${notificationId}/read`, { method: 'POST' }),
  markAllRead: () => request<void>('/api/notifications/read-all', { method: 'POST' }),
}
