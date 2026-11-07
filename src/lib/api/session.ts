import type { Role, SessionResponse } from './types'

/**
 * Sessão do usuário. O token de acesso (curto) vive só em memória; o token de renovação (longo, de
 * uso único) é guardado em localStorage para sobreviver a recarregamentos. Trade-off consciente: o
 * backend devolve ambos no corpo da resposta, então não há cookie httpOnly; a defesa contra XSS é não
 * usar HTML injetado e manter o token de acesso fora do storage.
 */
export interface Session {
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
  accountId: string
  role: Role
}

/** 'restoring': há um token de renovação guardado e ainda não sabemos se continua válido. */
export type SessionStatus = 'restoring' | 'anonymous' | 'authenticated'

export interface SessionState {
  status: SessionStatus
  session: Session | null
}

const STORAGE_KEY = 'unnia.session'

interface Persisted {
  refreshToken: string
  refreshExpiresAt: number
  accountId: string
  role: Role
}

type Listener = () => void

function readPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Persisted>
    if (typeof data.refreshToken !== 'string' || typeof data.accountId !== 'string' || !data.role) return null
    return {
      refreshToken: data.refreshToken,
      refreshExpiresAt: Number(data.refreshExpiresAt) || 0,
      accountId: data.accountId,
      role: data.role,
    }
  } catch {
    return null
  }
}

function writePersisted(value: Persisted | null): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage indisponível (modo privado, cota): a sessão vale só até recarregar a página
  }
}

export function sessionFromResponse(response: SessionResponse): Session {
  return {
    accessToken: response.token,
    accessExpiresAt: Date.parse(response.expiresAt),
    refreshToken: response.refreshToken,
    refreshExpiresAt: Date.parse(response.refreshExpiresAt),
    accountId: response.accountId,
    role: response.role,
  }
}

/** Armazém da sessão, observável por useSyncExternalStore e acessível fora do React (cliente HTTP). */
class SessionStore {
  private state: SessionState
  private listeners = new Set<Listener>()

  constructor() {
    this.state = readPersisted() ? { status: 'restoring', session: null } : { status: 'anonymous', session: null }
    if (typeof window !== 'undefined') {
      // logout (ou login) em outra aba
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY && event.newValue === null && this.state.status === 'authenticated') {
          this.setState({ status: 'anonymous', session: null })
        }
      })
    }
  }

  getState = (): SessionState => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Token de renovação mais recente, lido do storage: outra aba pode tê-lo rotacionado. */
  latestRefreshToken(): string | null {
    return readPersisted()?.refreshToken ?? this.state.session?.refreshToken ?? null
  }

  hasPersistedSession(): boolean {
    return readPersisted() !== null
  }

  set(session: Session): void {
    writePersisted({
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.refreshExpiresAt,
      accountId: session.accountId,
      role: session.role,
    })
    this.setState({ status: 'authenticated', session })
  }

  clear(): void {
    writePersisted(null)
    this.setState({ status: 'anonymous', session: null })
  }

  /** Marca como anônimo sem apagar o storage (por exemplo, falha temporária de rede ao restaurar). */
  markAnonymous(): void {
    this.setState({ status: 'anonymous', session: null })
  }

  private setState(next: SessionState): void {
    this.state = next
    this.listeners.forEach((listener) => listener())
  }
}

export const sessionStore = new SessionStore()
