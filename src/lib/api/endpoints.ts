import { request } from './client'
import type {
  EventView,
  Registrant,
  Me,
  NewEventInput,
  NgoProfile,
  RegisterNgoInput,
  RegisterVolunteerInput,
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
