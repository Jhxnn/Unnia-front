/**
 * Cliente de Server-Sent Events feito sobre `fetch`. O `EventSource` do navegador não deixa enviar o cabeçalho
 * `Authorization`, e a API autentica por token Bearer; por isso o fluxo é lido à mão.
 */

export interface SseMessage {
  /** Nome do evento ("ready", "update"...); "message" quando o servidor não informa. */
  event: string
  data: string
}

/**
 * Remonta mensagens SSE a partir de pedaços de texto que chegam em qualquer corte. Segue a especificação:
 * linhas terminam em \n, \r\n ou \r; uma linha em branco fecha a mensagem; linhas iniciadas por ":" são comentários
 * (os batimentos do servidor) e são ignoradas.
 */
export class SseParser {
  private buffer = ''
  private event = ''
  private data: string[] = []

  push(chunk: string): SseMessage[] {
    this.buffer += chunk
    const messages: SseMessage[] = []
    const lines = this.buffer.split(/\r\n|\r|\n/)
    // o último pedaço pode estar incompleto: fica para a próxima chamada
    this.buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line === '') {
        if (this.data.length > 0) {
          messages.push({ event: this.event || 'message', data: this.data.join('\n') })
        }
        this.event = ''
        this.data = []
      } else if (line.startsWith(':')) {
        continue
      } else {
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')
        if (field === 'event') this.event = value
        else if (field === 'data') this.data.push(value)
      }
    }
    return messages
  }
}

export interface StreamOptions {
  url: string
  /** Token de acesso atual; nulo quando não há sessão (o fluxo para). */
  getToken: () => Promise<string | null>
  onMessage: (message: SseMessage) => void
  /** Chamado a cada (re)conexão bem-sucedida, para quem quiser atualizar o que perdeu enquanto estava fora. */
  onOpen?: () => void
  signal: AbortSignal
  fetchImpl?: typeof fetch
  /** Troca a espera entre tentativas (os testes não esperam de verdade). */
  sleep?: (ms: number) => Promise<void>
}

const MIN_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * Mantém a conexão aberta até o `signal` ser abortado: reconecta sozinha quando cai (o servidor encerra conexões
 * antigas de tempos em tempos), com espera crescente entre tentativas.
 */
export async function openEventStream(options: StreamOptions): Promise<void> {
  const { url, getToken, onMessage, onOpen, signal, fetchImpl = fetch } = options
  const sleep = options.sleep ?? ((ms: number) => wait(ms, signal))
  let delay = MIN_DELAY_MS

  while (!signal.aborted) {
    try {
      const token = await getToken()
      if (!token) return // sem sessão: nada a escutar
      const response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal,
      })
      if (!response.ok || !response.body) {
        throw new Error(`fluxo respondeu ${response.status}`)
      }
      delay = MIN_DELAY_MS
      onOpen?.()

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const parser = new SseParser()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        for (const message of parser.push(decoder.decode(value, { stream: true }))) {
          onMessage(message)
        }
      }
    } catch {
      if (signal.aborted) return
    }
    if (signal.aborted) return
    await sleep(delay)
    delay = Math.min(delay * 2, MAX_DELAY_MS)
  }
}
