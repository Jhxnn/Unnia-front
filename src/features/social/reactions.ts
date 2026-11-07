import type { ReactionType } from '../../lib/api/types'

export const REACTIONS: { type: ReactionType; label: string }[] = [
  { type: 'LIKE', label: 'Curtir' },
  { type: 'LOVE', label: 'Adorei' },
  { type: 'SUPPORT', label: 'Apoio' },
]
