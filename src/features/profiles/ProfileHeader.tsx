import type { ReactNode } from 'react'
import type { AuthorRole } from '../../lib/api/types'
import { Avatar } from '../social/AuthorLine'

interface Props {
  name: string
  role: AuthorRole
  city: string
  about: string
  /** Etiquetas ao lado do nome (por exemplo, "ONG verificada"). */
  badges?: ReactNode
  actions?: ReactNode
}

/** Cabeçalho de perfil público, igual para ONGs e voluntários. */
export function ProfileHeader({ name, role, city, about, badges, actions }: Props) {
  return (
    <header className="profile-head">
      <Avatar name={name} role={role} />
      <div className="profile-head__body">
        <h1 className="profile-head__name">{name}</h1>
        <p className="profile-head__meta">
          {city}
          {badges}
        </p>
        {about ? <p className="profile-head__about">{about}</p> : null}
        {actions ? <div className="profile-head__actions">{actions}</div> : null}
      </div>
    </header>
  )
}
