/** Resposta de erro da API (Problem Details). */
export class ApiError extends Error {
  readonly status: number
  /** Erros de validação por campo (HTTP 400), quando a API os informa. */
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

/** HTTP 429: o limite de requisições (ou de tentativas de login) foi excedido. */
export class RateLimitError extends ApiError {
  readonly retryAfterSeconds: number

  constructor(message: string, retryAfterSeconds: number) {
    super(429, message)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/** Falha de rede: o servidor não respondeu. */
export class NetworkError extends Error {
  constructor() {
    super('Não foi possível falar com o servidor. Verifique sua conexão.')
    this.name = 'NetworkError'
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

/** "2 minutos", "45 segundos": tempo de espera legível a partir de segundos. */
export function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`
  }
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

/** Mensagem pronta para exibir ao usuário a partir de qualquer erro. */
export function describeError(error: unknown): string {
  if (error instanceof RateLimitError) {
    return `Muitas tentativas em pouco tempo. Tente de novo em ${formatWait(error.retryAfterSeconds)}.`
  }
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof NetworkError) {
    return error.message
  }
  return 'Algo deu errado. Tente novamente.'
}
