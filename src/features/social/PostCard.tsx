import type { ReactNode } from 'react'
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
  reacting = false,
  commentsOpen,
  onReact,
  onDelete,
  onToggleComments,
  actions,
  children,
}: Props) {
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

      <p className="post__text">{post.text}</p>

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
        {canDelete ? (
          <ConfirmButton label="Excluir" confirmLabel="Confirmar exclusão" onConfirm={onDelete} />
        ) : null}
      </div>

      {commentsOpen ? <div className="post__comments">{children}</div> : null}
    </article>
  )
}
