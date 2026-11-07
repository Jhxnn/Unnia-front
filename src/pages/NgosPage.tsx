import { Link } from 'react-router'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Avatar } from '../features/social/AuthorLine'
import { useNgoShowcase } from '../features/profiles/queries'
import { describeError } from '../lib/api/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import '../features/profiles/profiles.css'
import './page.css'
import { formatPlace } from '../lib/format'

export function NgosPage() {
  useDocumentTitle('ONGs')
  const query = useNgoShowcase()
  const ngos = query.data?.pages.flat() ?? []

  return (
    <div className="page page-section">
      <header className="page-head">
        <h1 className="page-head__title">ONGs</h1>
        <p className="page-head__lead">
          Organizações verificadas pela equipe do Unnia. Siga as que combinam com você para acompanhar os eventos
          delas no seu feed.
        </p>
      </header>

      {query.isPending ? (
        <Spinner label="Buscando as ONGs…" />
      ) : query.isError ? (
        <EmptyState
          title="Não foi possível carregar as ONGs"
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {describeError(query.error)}
        </EmptyState>
      ) : ngos.length === 0 ? (
        <EmptyState title="Nenhuma ONG verificada ainda">
          As ONGs aparecem aqui assim que a equipe do Unnia verifica o cadastro delas.
        </EmptyState>
      ) : (
        <>
          <ul className="ngo-grid">
            {ngos.map((ngo) => (
              <li key={ngo.ngoId}>
                <Link to={`/ongs/${ngo.ngoId}`} className="ngo-card">
                  <Avatar name={ngo.name} role="NGO" />
                  <span className="ngo-card__name">{ngo.name}</span>
                  <span className="ngo-card__city">{formatPlace(ngo.city, ngo.state)}</span>
                  <span className="ngo-card__about">{ngo.description}</span>
                </Link>
              </li>
            ))}
          </ul>
          {query.hasNextPage ? (
            <div className="load-more">
              <Button variant="secondary" busy={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                Carregar mais
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
