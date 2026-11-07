import { Spinner } from '../../components/Spinner'
import { describeError } from '../../lib/api/errors'
import { useSession } from '../auth/useSession'
import { PostItem } from './PostItem'
import { useAuthorPosts } from './queries'
import './social.css'

/** As publicações de uma conta, para os perfis públicos. */
export function AuthorPosts({ accountId }: { accountId: string }) {
  const { status } = useSession()
  const posts = useAuthorPosts(status === 'authenticated' ? accountId : undefined)

  // as publicações só são abertas a quem está logado
  if (status !== 'authenticated') return null

  return (
    <section aria-label="Publicações" className="profile-posts">
      <h2 className="profile-posts__title">Publicações</h2>
      {posts.isPending ? (
        <Spinner label="Buscando as publicações…" />
      ) : posts.isError ? (
        <p className="thread__empty">{describeError(posts.error)}</p>
      ) : posts.data.length === 0 ? (
        <p className="thread__empty">Nenhuma publicação ainda.</p>
      ) : (
        <div className="posts">
          {posts.data.map((post) => (
            <PostItem key={post.postId} post={post} />
          ))}
        </div>
      )}
    </section>
  )
}
