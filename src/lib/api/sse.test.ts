import { describe, expect, it, vi } from 'vitest'
import { SseParser, openEventStream, type SseMessage } from './sse'

describe('SseParser', () => {
  it('lê uma mensagem com nome e dados', () => {
    const parser = new SseParser()

    expect(parser.push('event: update\ndata: {"a":1}\n\n')).toEqual([{ event: 'update', data: '{"a":1}' }])
  })

  it('sem nome de evento, a mensagem se chama "message"', () => {
    expect(new SseParser().push('data: oi\n\n')).toEqual([{ event: 'message', data: 'oi' }])
  })

  it('junta linhas de dados com quebra de linha', () => {
    expect(new SseParser().push('data: a\ndata: b\n\n')).toEqual([{ event: 'message', data: 'a\nb' }])
  })

  it('aguenta cortes em qualquer ponto, até no meio de uma palavra', () => {
    const parser = new SseParser()

    expect(parser.push('event: upd')).toEqual([])
    expect(parser.push('ate\ndata: {"x"')).toEqual([])
    expect(parser.push(':2}\n')).toEqual([])
    expect(parser.push('\n')).toEqual([{ event: 'update', data: '{"x":2}' }])
  })

  it('entrega várias mensagens de uma vez', () => {
    const messages = new SseParser().push('event: ready\ndata: {}\n\nevent: update\ndata: 1\n\n')

    expect(messages.map((m) => m.event)).toEqual(['ready', 'update'])
  })

  it('ignora o batimento (comentário) e aceita \\r\\n', () => {
    const parser = new SseParser()

    expect(parser.push(': ping\n\n')).toEqual([])
    expect(parser.push('event: update\r\ndata: ok\r\n\r\n')).toEqual([{ event: 'update', data: 'ok' }])
  })

  it('não repete o nome do evento anterior na mensagem seguinte', () => {
    const parser = new SseParser()
    parser.push('event: update\ndata: 1\n\n')

    expect(parser.push('data: 2\n\n')).toEqual([{ event: 'message', data: '2' }])
  })

  it('uma linha em branco sem dados não gera mensagem', () => {
    expect(new SseParser().push('\n\n')).toEqual([])
  })
})

/** Resposta que entrega o texto em pedaços, como o servidor faz. */
function streamOf(...chunks: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('openEventStream', () => {
  it('manda o token, avisa a abertura e entrega as mensagens', async () => {
    const controller = new AbortController()
    const received: SseMessage[] = []
    const onOpen = vi.fn()
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      streamOf('event: ready\ndata: {}\n\n', 'event: update\ndata: {"type":"NEW_MESSAGE"}\n\n'),
    )

    await openEventStream({
      url: '/api/stream',
      getToken: async () => 'token-1',
      signal: controller.signal,
      fetchImpl,
      onOpen,
      onMessage: (message) => {
        received.push(message)
        if (message.event === 'update') controller.abort()
      },
      sleep: async () => undefined,
    })

    expect(received.map((m) => m.event)).toEqual(['ready', 'update'])
    expect(onOpen).toHaveBeenCalledTimes(1)
    const headers = (fetchImpl.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-1')
    expect(headers.Accept).toBe('text/event-stream')
  })

  it('quando o servidor encerra a conexão, reconecta e avisa a abertura de novo', async () => {
    const controller = new AbortController()
    const onOpen = vi.fn(() => {
      if (onOpen.mock.calls.length === 2) controller.abort()
    })
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => streamOf('event: ready\ndata: {}\n\n'))
    const sleep = vi.fn(async () => undefined)

    await openEventStream({
      url: '/api/stream',
      getToken: async () => 'token',
      signal: controller.signal,
      fetchImpl,
      onOpen,
      onMessage: () => undefined,
      sleep,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it('erro do servidor: tenta de novo com espera crescente, até o limite', async () => {
    const controller = new AbortController()
    const delays: number[] = []
    let calls = 0
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => {
      calls++
      if (calls > 8) controller.abort()
      return new Response('', { status: 503 })
    })

    await openEventStream({
      url: '/api/stream',
      getToken: async () => 'token',
      signal: controller.signal,
      fetchImpl,
      onMessage: () => undefined,
      sleep: async (ms) => {
        delays.push(ms)
      },
    })

    expect(delays.slice(0, 6)).toEqual([1000, 2000, 4000, 8000, 16000, 30000])
    expect(Math.max(...delays)).toBe(30000)
  })

  it('a espera volta ao mínimo depois de uma conexão bem-sucedida', async () => {
    const controller = new AbortController()
    const delays: number[] = []
    const responses = [new Response('', { status: 503 }), new Response('', { status: 503 }), streamOf(': ping\n\n')]
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => {
      const next = responses.shift()
      if (!next) {
        controller.abort()
        return new Response('', { status: 503 })
      }
      return next
    })

    await openEventStream({
      url: '/api/stream',
      getToken: async () => 'token',
      signal: controller.signal,
      fetchImpl,
      onMessage: () => undefined,
      sleep: async (ms) => {
        delays.push(ms)
      },
    })

    expect(delays).toEqual([1000, 2000, 1000])
  })

  it('sem sessão (token nulo), nem tenta conectar', async () => {
    const fetchImpl = vi.fn<typeof fetch>()

    await openEventStream({
      url: '/api/stream',
      getToken: async () => null,
      signal: new AbortController().signal,
      fetchImpl,
      onMessage: () => undefined,
      sleep: async () => undefined,
    })

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('abortar interrompe sem tentar reconectar', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchImpl = vi.fn<typeof fetch>()

    await openEventStream({
      url: '/api/stream',
      getToken: async () => 'token',
      signal: controller.signal,
      fetchImpl,
      onMessage: () => undefined,
    })

    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
