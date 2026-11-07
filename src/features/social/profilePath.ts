import type { Author } from '../../lib/api/types'

/** Para onde leva o nome do autor: o perfil público de ONGs e voluntários. */
export function profilePath(author: Author): string | null {
  if (!author.profileId) return null
  if (author.role === 'NGO') return `/ongs/${author.profileId}`
  if (author.role === 'VOLUNTEER') return `/voluntarios/${author.profileId}`
  return null
}
