import { Button, ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { EventCard } from '../features/events/EventCard'
import { useMyRegistrations } from '../features/events/queries'
import { describeError } from '../lib/api/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

export function MyRegistrationsPage() {
  useDocumentTitle('Minhas inscrições')
  const { data, isPending, isError, error, refetch } = useMyRegistrations(true)

  return (
    <div className="page page-section">
      <header className="page-head">
        <h1 className="page-head__title">Minhas inscrições</h1>
        <p className="page-head__lead">Eventos em que você tem vaga reservada.</p>
      </header>

      {isPending ? (
        <Spinner label="Buscando suas inscrições…" />
      ) : isError ? (
        <EmptyState
          title="Não conseguimos carregar suas inscrições"
          action={<Button onClick={() => refetch()}>Tentar de novo</Button>}
        >
          {describeError(error)}
        </EmptyState>
      ) : data.length === 0 ? (
        <EmptyState title="Você ainda não tem vaga em nenhum evento" action={<ButtonLink to="/eventos">Ver eventos abertos</ButtonLink>}>
          Escolha um evento, toque em Inscrever-se e ele aparece aqui.
        </EmptyState>
      ) : (
        <div className="event-grid">
          {data.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
