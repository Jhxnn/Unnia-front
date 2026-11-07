import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import { ConfirmButton } from '../../components/ConfirmButton'
import type { CommentView } from '../../lib/api/types'
import { timeAgo } from '../../lib/format'
import { AuthorLine } from './AuthorLine'

export const MAX_COMMENT_LENGTH = 1000

function CommentForm({
  label,
  busy,
  onSubmit,
  onCancel,
}: {
  label: string
  busy: boolean
  onSubmit: (text: string) => void
  onCancel?: () => void
}) {
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <input
        className="field__control"
        aria-label={label}
        placeholder={label}
        maxLength={MAX_COMMENT_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Button type="submit" busy={busy} disabled={!text.trim()}>
        Enviar
      </Button>
      {onCancel ? (
        <Button variant="quiet" onClick={onCancel}>
          Cancelar
        </Button>
      ) : null}
    </form>
  )
}

interface Props {
  comments: CommentView[]
  now: Date
  /** Conta de quem está logado; pode excluir os próprios comentários. */
  viewerAccountId: string | null
  busy: boolean
  onAdd: (text: string) => void
  onReply: (commentId: string, text: string) => void
  onDelete: (commentId: string) => void
  /** Ação de denúncia de cada comentário. */
  renderReport?: (comment: CommentView) => ReactNode
}

export function CommentThread({ comments, now, viewerAccountId, busy, onAdd, onReply, onDelete, renderReport }: Props) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  function renderComment(comment: CommentView, isReply: boolean) {
    return (
      <li key={comment.commentId} className={isReply ? 'comment comment--reply' : 'comment'}>
        <AuthorLine author={comment.author} aside={timeAgo(comment.createdAt, now)} />
        <p className="comment__text">{comment.text}</p>
        <div className="comment__actions">
          {!isReply ? (
            <Button variant="quiet" onClick={() => setReplyingTo(comment.commentId)}>
              Responder
            </Button>
          ) : null}
          {viewerAccountId !== comment.authorId ? renderReport?.(comment) : null}
          {viewerAccountId === comment.authorId ? (
            <ConfirmButton
              label="Excluir"
              confirmLabel="Confirmar exclusão"
              onConfirm={() => onDelete(comment.commentId)}
            />
          ) : null}
        </div>

        {replyingTo === comment.commentId ? (
          <CommentForm
            label={`Responder a ${comment.author.name}`}
            busy={busy}
            onCancel={() => setReplyingTo(null)}
            onSubmit={(text) => {
              onReply(comment.commentId, text)
              setReplyingTo(null)
            }}
          />
        ) : null}

        {comment.replies.length > 0 ? (
          <ul className="comments comments--replies">{comment.replies.map((reply) => renderComment(reply, true))}</ul>
        ) : null}
      </li>
    )
  }

  return (
    <div className="thread">
      {comments.length === 0 ? (
        <p className="thread__empty">Ninguém comentou ainda. Seja a primeira pessoa.</p>
      ) : (
        <ul className="comments">{comments.map((comment) => renderComment(comment, false))}</ul>
      )}
      <CommentForm label="Escreva um comentário" busy={busy} onSubmit={onAdd} />
    </div>
  )
}
