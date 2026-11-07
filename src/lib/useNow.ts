import { useMemo, useSyncExternalStore } from 'react'

const TICK_MS = 30_000

const listeners = new Set<() => void>()
let current = Date.now()
let timer: number | undefined

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (timer === undefined) {
    current = Date.now()
    timer = window.setInterval(() => {
      current = Date.now()
      listeners.forEach((notify) => notify())
    }, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

const getSnapshot = () => current

/**
 * "Agora" que se atualiza a cada 30 segundos, compartilhado por todos os componentes. Serve para a
 * situação de um evento (aberto, em andamento...) acompanhar o relógio sem recarregar a página, e
 * evita chamar Date durante a renderização.
 */
export function useNow(): Date {
  const milliseconds = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return useMemo(() => new Date(milliseconds), [milliseconds])
}
