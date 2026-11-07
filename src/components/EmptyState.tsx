import type { ReactNode } from 'react'
import './feedback.css'

interface Props {
  title: string
  children?: ReactNode
  action?: ReactNode
}

/** Tela vazia ou de erro: diz o que aconteceu e o que fazer em seguida. */
export function EmptyState({ title, children, action }: Props) {
  return (
    <div className="empty">
      <span className="empty__marks" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <h2 className="empty__title">{title}</h2>
      {children ? <p className="empty__text">{children}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  )
}
