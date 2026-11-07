import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ConfirmButton } from '../../components/ConfirmButton'
import type { PostView, ReactionType } from '../../lib/api/types'
import { pluralize, timeAgo } from '../../lib/format'
import { AuthorLine } from './AuthorLine'
import { Button } from '../../components/Button'
import { ReactionBar } from './ReactionBar'

interface Props {
  post: PostView
  now: Date
  canDelete: boolean
  /** O dono pode editar o texto; passe junto com onEdit. */
  onEdit?: (text: string) => void
  editing?: boolean
  reacting?: boolean
  commentsOpen: boolean
  onReact: (type: ReactionType | null) => void
  onDelete: () => void
  onToggleComments: () => void
  /** Ação de denúncia (ou outras) ao lado de "Comentários". */
  actions?: ReactNode
  /** Os comentários, quando abertos. */
  children?: ReactNode
}

export function PostCard({
  post,
  now,
  canDelete,
  onEdit,
  editing = false,
  reacting = false,
  commentsOpen,
  onReact,
  onDelete,
  onToggleComments,
  actions,
  children,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  function submitEdit(event: FormEvent) {
    event.preventDefault()
    const text = (draft ?? '').trim()
    if (!text || text === post.text) {
      setDraft(null)
      return
    }
    onEdit?.(text)
    setDraft(null)
  }

  return (
    <article className="post">
      <AuthorLine
        author={post.author}
        aside={
          <Link to={`/posts/${post.postId}`} className="post__time">
            {timeAgo(post.createdAt, now)}
            {post.editedAt ? ' · editado' : ''}
          </Link>
        }
      />

      {draft === null ? (
        <p className="post__text">{post.text}</p>
      ) : (
        <form className="post__edit" onSubmit={submitEdit} aria-label="Editar postagem">
          <textarea
            className="field__control field__control--area"
            aria-label="Texto da postagem"
            rows={3}
            maxLength={2000}
            value={draft}
            onChange={(change) => setDraft(change.target.value)}
          />
          <div className="post__actions">
            <Button type="submit" busy={editing} disabled={!draft.trim()}>
              Salvar
            </Button>
            <Button variant="quiet" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {post.linkedEventId ? (
        <Link to={`/eventos/${post.linkedEventId}`} className="post__event">
          Ver o evento
        </Link>
      ) : null}

      <ReactionBar current={post.myReaction} count={post.reactionCount} disabled={reacting} onReact={onReact} />

      <div className="post__actions">
        <Button variant="quiet" aria-expanded={commentsOpen} onClick={onToggleComments}>
          {pluralize(post.commentCount, 'comentário', 'comentários')}
        </Button>
        {actions}
        {onEdit && draft === null ? (
          <Button variant="quiet" onClick={() => setDraft(post.text)}>
            Editar
          </Button>
        ) : null}
        {canDelete ? (
          <ConfirmButton label="Excluir" confirmLabel="Confirmar exclusão" onConfirm={onDelete} />
        ) : null}
      </div>

      {commentsOpen ? <div className="post__comments">{children}</div> : null}
    </article>
  )
}
