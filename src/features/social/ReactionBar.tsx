import type { ReactionType } from '../../lib/api/types'
import { pluralize } from '../../lib/format'
import { REACTIONS } from './reactions'

interface Props {
  current: ReactionType | null
  count: number
  disabled?: boolean
  /** `null` remove a reação: clicar de novo na escolhida desfaz. */
  onReact: (type: ReactionType | null) => void
}

export function ReactionBar({ current, count, disabled = false, onReact }: Props) {
  return (
    <div className="reactions" role="group" aria-label="Reagir">
      {REACTIONS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          className="reaction"
          aria-pressed={current === type}
          disabled={disabled}
          onClick={() => onReact(current === type ? null : type)}
        >
          {label}
        </button>
      ))}
      <span className="reactions__count">{pluralize(count, 'reação', 'reações')}</span>
    </div>
  )
}
