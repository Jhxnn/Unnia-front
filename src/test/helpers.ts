import { vi } from 'vitest'
import type { SessionResponse } from '../lib/api/types'

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
    ...init,
  })
}

export function problem(status: number, detail: string, extra: Record<string, unknown> = {}, headers = {}): Response {
  return jsonResponse({ title: 'erro', status, detail, ...extra }, { status, headers })
}

export function sessionBody(overrides: Partial<SessionResponse> = {}): SessionResponse {
  return {
    token: 'access-1',
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: 'refresh-1',
    refreshExpiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    accountId: 'account-1',
    role: 'VOLUNTEER',
    ...overrides,
  }
}

/** Substitui o fetch global por um mock e devolve-o. */
export function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Cabeçalho Authorization enviado na chamada n do mock. */
export function authorizationOf(fetchMock: ReturnType<typeof mockFetch>, call: number): string | undefined {
  const init = fetchMock.mock.calls[call]?.[1]
  return (init?.headers as Record<string, string> | undefined)?.Authorization
}
