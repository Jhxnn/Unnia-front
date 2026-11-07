import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Author } from '../../lib/api/types'
import { initialOf } from '../../lib/format'
import { profilePath } from './profilePath'

const ROLE_LABEL: Record<Author['role'], string | null> = {
  NGO: 'ONG',
  VOLUNTEER: null,
  ADMIN: 'Equipe',
  UNKNOWN: null,
}

export function Avatar({ name, role }: { name: string; role: Author['role'] }) {
  return (
    <span className={`avatar avatar--${role.toLowerCase()}`} aria-hidden="true">
      {initialOf(name)}
    </span>
  )
}

/** Avatar, nome (com link para o perfil) e papel, com um complemento à direita (como "há 5 min"). */
export function AuthorLine({ author, aside }: { author: Author; aside?: ReactNode }) {
  const path = profilePath(author)
  const role = ROLE_LABEL[author.role]
  return (
    <div className="author">
      <Avatar name={author.name} role={author.role} />
      <div className="author__text">
        <span className="author__name">
          {path ? <Link to={path}>{author.name}</Link> : author.name}
          {role ? <span className="chip chip--blue">{role}</span> : null}
        </span>
        {aside ? <span className="author__aside">{aside}</span> : null}
      </div>
    </div>
  )
}
