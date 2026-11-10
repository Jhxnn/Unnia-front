import { Button, ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useSession } from '../features/auth/useSession'
import { useMyEvents } from '../features/events/queries'
import { PostComposer } from '../features/social/PostComposer'
import { PostItem } from '../features/social/PostItem'
import { useFeed, usePublishPost, useUploadImage } from '../features/social/queries'
import { describeError } from '../lib/api/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import '../features/social/social.css'
import './page.css'

export function FeedPage() {
  useDocumentTitle('Início')
  const { session } = useSession()
  const feed = useFeed()
  const myEvents = useMyEvents(session?.role === 'NGO')
  const publish = usePublishPost()
  const upload = useUploadImage()
  const promotable = (myEvents.data ?? []).filter((event) => event.status === 'PUBLISHED')

  const posts = feed.data?.pages.flat() ?? []

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Início</h1>
        <p className="page-head__lead">As novidades de quem você segue e as suas próprias publicações.</p>
      </header>

      <PostComposer
        busy={publish.isPending}
        events={promotable}
        onSubmit={(input) => publish.mutate(input)}
        onUpload={(file) => upload.mutateAsync(file).then((media) => media.url)}
      />

      {feed.isPending ? (
        <Spinner label="Buscando as publicações…" />
      ) : feed.isError ? (
        <EmptyState
          title="Não foi possível carregar o feed"
          action={
            <Button variant="secondary" onClick={() => feed.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {describeError(feed.error)}
        </EmptyState>
      ) : posts.length === 0 ? (
        <EmptyState
          title="Seu feed está vazio"
          action={<ButtonLink to="/ongs">Conhecer ONGs</ButtonLink>}
        >
          Siga ONGs para ver o que elas publicam, ou escreva a primeira publicação.
        </EmptyState>
      ) : (
        <>
          <div className="posts">
            {posts.map((post) => (
              <PostItem key={post.postId} post={post} />
            ))}
          </div>
          {feed.hasNextPage ? (
            <div className="load-more">
              <Button variant="secondary" busy={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
                Carregar mais
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
