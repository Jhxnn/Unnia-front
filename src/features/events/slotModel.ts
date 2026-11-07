/** Acima disto, cada marca representa várias pessoas, para a fileira continuar legível. */
export const MAX_SLOTS = 40

export interface SlotModel {
  total: number
  filled: number
  /** Quantas vagas cada marca representa. */
  perSlot: number
}

/**
 * Converte vagas em marcas. Nunca mostra a fileira cheia se ainda há vaga, nem vazia se já há alguém:
 * a fileira não pode contar uma história diferente dos números.
 */
export function slotModel(capacity: number, occupied: number, maxSlots: number = MAX_SLOTS): SlotModel {
  const total = Math.max(1, Math.min(capacity, maxSlots))
  const perSlot = Math.max(1, Math.ceil(capacity / total))
  if (occupied <= 0) return { total, filled: 0, perSlot }
  if (occupied >= capacity) return { total, filled: total, perSlot }
  const proportional = Math.round((occupied / capacity) * total)
  return { total, filled: Math.min(total - 1, Math.max(1, proportional)), perSlot }
}
