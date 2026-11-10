import { ApiError, NetworkError, RateLimitError } from './errors'
import { sessionFromResponse, sessionStore } from './session'
import type { SessionResponse } from './types'

const BASE_URL = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Renova o token de acesso um pouco antes de ele vencer, para não falhar no meio de uma requisição. */
const EXPIRY_MARGIN_MS = 30_000
const REFRESH_LOCK = 'unnia:refresh'
const DEFAULT_RETRY_AFTER_SECONDS = 60

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** Envio de arquivo (multipart). O navegador define o cabeçalho com o limite do formulário. */
  form?: FormData
  query?: Record<string, string | number | boolean | undefined>
  /** Padrão: true. Rotas públicas de autenticação (login, cadastro, refresh) usam false. */
  auth?: boolean
  signal?: AbortSignal
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Confira os dados informados.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procurou.',
  409: 'Essa ação conflita com o estado atual. Atualize a página e tente de novo.',
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: { detail?: string; fields?: Record<string, string> } | null = null
  try {
    body = await response.json()
  } catch {
    // corpo vazio ou que não é JSON
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    return new RateLimitError(
      body?.detail ?? 'Muitas requisições.',
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : DEFAULT_RETRY_AFTER_SECONDS,
    )
  }
  const fallback =
    response.status >= 500 ? 'O servidor falhou. Tente novamente em instantes.' : DEFAULT_MESSAGES[response.status]
  return new ApiError(response.status, body?.detail ?? fallback ?? 'Algo deu errado.', body?.fields ?? {})
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `${url}?${text}` : url
}

async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined && !options.form) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new NetworkError()
  }
}

// --- renovação de sessão ---------------------------------------------------------------------

let inflightRefresh: Promise<string | null> | null = null

/**
 * O token de renovação é de uso único e reapresentá-lo derruba a sessão inteira no backend. Por isso a
 * renovação é serializada: dentro da aba por uma promessa compartilhada, e entre abas por um lock do
 * navegador (Web Locks), relendo o token mais recente do storage já com o lock em mãos.
 */
export function refreshSession(): Promise<string | null> {
  inflightRefresh ??= withRefreshLock(performRefresh).finally(() => {
    inflightRefresh = null
  })
  return inflightRefresh
}

function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks
  return locks ? locks.request(REFRESH_LOCK, task) : task()
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = sessionStore.latestRefreshToken()
  if (!refreshToken) return null

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return null // sem rede: mantém a sessão guardada para tentar de novo depois
  }

  if (response.ok) {
    const session = sessionFromResponse((await response.json()) as SessionResponse)
    sessionStore.set(session)
    return session.accessToken
  }
  if (response.status === 401) {
    sessionStore.clear() // o backend invalidou a sessão (expirada, encerrada ou reutilizada)
  }
  return null
}

let restoring: Promise<void> | null = null

/** Ao abrir o app: troca o token de renovação guardado por uma sessão ativa, se ele ainda valer. */
export function restoreSession(): Promise<void> {
  restoring ??= (async () => {
    if (sessionStore.getState().status !== 'restoring') return
    const token = await refreshSession()
    if (!token && sessionStore.getState().status === 'restoring') {
      sessionStore.markAnonymous()
    }
  })()
  return restoring
}

async function currentAccessToken(): Promise<string | null> {
  if (sessionStore.getState().status === 'restoring') {
    await restoreSession()
  }
  const { session } = sessionStore.getState()
  if (!session) return null
  if (session.accessExpiresAt - EXPIRY_MARGIN_MS > Date.now()) return session.accessToken
  return refreshSession()
}

// --- API pública do cliente -----------------------------------------------------------------

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authenticated = options.auth !== false
  const token = authenticated ? await currentAccessToken() : null

  let response = await send(path, options, token)
  if (response.status === 401 && token) {
    const renewed = await refreshSession()
    if (renewed) response = await send(path, options, renewed)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Token de acesso válido (renovando se estiver perto de vencer), ou nulo sem sessão. Para o canal de tempo real. */
export function accessToken(): Promise<string | null> {
  return currentAccessToken()
}

/** Faz login e passa a guardar a sessão. */
export async function signIn(email: string, password: string): Promise<void> {
  const response = await request<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  sessionStore.set(sessionFromResponse(response))
}

/** Encerra a sessão no servidor (melhor esforço) e no navegador. */
export async function signOut(): Promise<void> {
  const refreshToken = sessionStore.latestRefreshToken()
  sessionStore.clear()
  if (!refreshToken) return
  try {
    await request<void>('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false })
  } catch {
    // o token local já foi descartado; o do servidor expira sozinho
  }
}
