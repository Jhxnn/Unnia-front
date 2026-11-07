import { useParams } from 'react-router'
import { ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { PostItem } from '../features/social/PostItem'
import { usePost } from '../features/social/queries'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import '../features/social/social.css'
import './page.css'

/** Uma postagem sozinha, com os comentários abertos. É para onde levam as notificações. */
export function PostPage() {
  useDocumentTitle('Postagem')
  const { postId = '' } = useParams()
  const post = usePost(postId)

  return (
    <div className="page page--narrow page-section">
      {post.isPending ? (
        <Spinner label="Buscando a postagem…" />
      ) : post.isError ? (
        <EmptyState title="Postagem indisponível" action={<ButtonLink to="/inicio">Voltar ao início</ButtonLink>}>
          Ela pode ter sido excluída ou removida pela equipe.
        </EmptyState>
      ) : (
        <div className="posts">
          <PostItem post={post.data} defaultOpen />
        </div>
      )}
    </div>
  )
}
