import { useState } from 'react'
import { Button } from './Button'

interface Props {
  label: string
  confirmLabel: string
  onConfirm: () => void
  busy?: boolean
}

/** Ação destrutiva em duas etapas: o primeiro clique pede confirmação, o segundo executa. */
export function ConfirmButton({ label, confirmLabel, onConfirm, busy = false }: Props) {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <Button variant="danger" onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  }
  return (
    <span className="confirm">
      <Button
        variant="danger"
        busy={busy}
        onClick={() => {
          onConfirm()
          setAsking(false)
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="quiet" onClick={() => setAsking(false)}>
        Voltar
      </Button>
    </span>
  )
}
