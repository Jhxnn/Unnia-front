import { useCallback, useEffect, useState } from 'react'

/**
 * Contagem regressiva em segundos, para botões que só podem ser usados de novo depois de um intervalo
 * (como o reenvio do e-mail). `start` reinicia a contagem; `remaining` chega a 0 e para.
 */
export function useCountdown(): { remaining: number; start: (seconds: number) => void } {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (endsAt === null) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) setEndsAt(null)
    }
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [endsAt])

  const start = useCallback((seconds: number) => setEndsAt(Date.now() + seconds * 1000), [])
  return { remaining, start }
}
