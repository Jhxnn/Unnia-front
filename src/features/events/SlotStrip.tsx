import { pluralize } from '../../lib/format'
import { MAX_SLOTS, slotModel } from './slotModel'
import './slots.css'

/** A fileira é sempre de uma linha só; quanto menor o tamanho, menos marcas cabem com folga. */
const MAX_SLOTS_BY_SIZE = { sm: 24, lg: 32, xl: MAX_SLOTS } as const

interface Props {
  capacity: number
  occupied: number
  size?: 'sm' | 'lg' | 'xl'
}

/**
 * A fileira de vagas: cada vaga é uma linha de assinatura; as ocupadas ficam marcadas em amarelo.
 * É o elemento que identifica o Unnia: mostra, de relance, o que os números dizem.
 */
export function SlotStrip({ capacity, occupied, size = 'sm' }: Props) {
  const { total, filled } = slotModel(capacity, occupied, MAX_SLOTS_BY_SIZE[size])
  const free = Math.max(0, capacity - occupied)
  const summary =
    free === 0
      ? `Lotado: ${occupied} de ${capacity} vagas ocupadas`
      : `${occupied} de ${capacity} vagas ocupadas, ${pluralize(free, 'livre', 'livres')}`
  return (
    <div className={`slots slots--${size}`} role="img" aria-label={summary}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={index < filled ? 'slots__slot slots__slot--filled' : 'slots__slot'}
          style={index < filled ? { ['--i' as string]: index } : undefined}
        />
      ))}
    </div>
  )
}

/** Legenda numérica da fileira, em mono, como o total de uma lista de presença. */
export function SlotCaption({ capacity, occupied }: { capacity: number; occupied: number }) {
  const free = Math.max(0, capacity - occupied)
  return (
    <p className="slot-caption">
      <span className="slot-caption__count">
        {occupied}/{capacity}
      </span>
      <span>{free === 0 ? 'Lotado' : pluralize(free, 'vaga livre', 'vagas livres')}</span>
    </p>
  )
}
