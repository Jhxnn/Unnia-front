import type { EventPhase } from './eventPolicy'
import './events.css'

const LABELS: Record<Exclude<EventPhase, 'open'>, string> = {
  draft: 'Rascunho',
  full: 'Lotado',
  ongoing: 'Em andamento',
  ended: 'Encerrado',
  cancelled: 'Cancelado',
}

/** Só aparece quando há algo a avisar: um evento aberto com vagas não precisa de selo. */
export function PhaseBadge({ phase }: { phase: EventPhase }) {
  if (phase === 'open') return null
  return <span className={`phase phase--${phase}`}>{LABELS[phase]}</span>
}
