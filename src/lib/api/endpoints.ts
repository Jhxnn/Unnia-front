import { request } from './client'
import type {
  EventView,
  Registrant,
  Me,
  NewEventInput,
  NgoProfile,
  NgoReview,
  RegisterNgoInput,
  RegisterVolunteerInput,
  ReportView,
  VerificationStatus,
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
