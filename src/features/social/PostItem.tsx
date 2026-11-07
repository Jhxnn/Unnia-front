import { useState } from 'react'
import { Spinner } from '../../components/Spinner'
import { describeError } from '../../lib/api/errors'
import type { PostView } from '../../lib/api/types'
import { useNow } from '../../lib/useNow'
import { useSession } from '../auth/useSession'
import { ReportButton } from '../moderation/ReportButton'
import { CommentThread } from './CommentThread'
import { PostCard } from './PostCard'
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useDeletePost,
  useReact,
  useReply,
} from './queries'

function PostComments({ postId, viewerAccountId }: { postId: string; viewerAccountId: string | null }) {
  const now = useNow()
  const comments = useComments(postId, true)
  const add = useAddComment(postId)
  const reply = useReply()
  const remove = useDeleteComment()

  if (comments.isPending) return <Spinner label="Buscando os comentários…" />
  if (comments.isError) return <p className="thread__empty">{describeError(comments.error)}</p>

  return (
    <CommentThread
      comments={comments.data}
      now={now}
      viewerAccountId={viewerAccountId}
      busy={add.isPending || reply.isPending}
      onAdd={(text) => add.mutate(text)}
      onReply={(commentId, text) => reply.mutate({ commentId, text })}
      onDelete={(commentId) => remove.mutate(commentId)}
      renderReport={(comment) => <ReportButton targetType="COMMENT" targetId={comment.commentId} />}
    />
  )
}

/** Uma postagem com tudo ligado à API: reagir, comentar, excluir (se for sua) e denunciar (se não for). */
export function PostItem({ post, defaultOpen = false }: { post: PostView; defaultOpen?: boolean }) {
  const { session } = useSession()
  const now = useNow()
  const [open, setOpen] = useState(defaultOpen)
  const react = useReact()
  const remove = useDeletePost()
  const viewerAccountId = session?.accountId ?? null
  const mine = viewerAccountId === post.authorId

  return (
    <PostCard
      post={post}
      now={now}
      canDelete={mine}
      reacting={react.isPending}
      commentsOpen={open}
      onReact={(type) => react.mutate({ postId: post.postId, type })}
      onDelete={() => remove.mutate(post.postId)}
      onToggleComments={() => setOpen((current) => !current)}
      actions={mine ? null : <ReportButton targetType="POST" targetId={post.postId} />}
    >
      <PostComments postId={post.postId} viewerAccountId={viewerAccountId} />
    </PostCard>
  )
}
