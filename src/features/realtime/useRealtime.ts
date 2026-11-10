import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { accessToken } from '../../lib/api/client'
import { openEventStream } from '../../lib/api/sse'
import { CATCH_UP, invalidationsFor, parseUpdate } from './invalidations'

const BASE_URL = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/**
 * Mantém aberto o canal de tempo real enquanto há sessão. A cada aviso do servidor, atualiza só as consultas
 * afetadas; ao reconectar, atualiza notificações e mensagens para recuperar o que passou durante a queda.
 * As consultas periódicas continuam como rede de segurança, só que bem mais espaçadas.
 */
export function useRealtime(enabled: boolean): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()

    void openEventStream({
      url: `${BASE_URL}/api/stream`,
      getToken: accessToken,
      signal: controller.signal,
      onOpen: () => {
        for (const queryKey of CATCH_UP) void queryClient.invalidateQueries({ queryKey })
      },
      onMessage: (message) => {
        if (message.event !== 'update') return
        const update = parseUpdate(message.data)
        if (!update) return
        for (const queryKey of invalidationsFor(update)) void queryClient.invalidateQueries({ queryKey })
      },
    })

    return () => controller.abort()
  }, [enabled, queryClient])
}
