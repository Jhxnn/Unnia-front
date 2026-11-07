import { useMemo, useState } from 'react'
import { Button, ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { TextField } from '../components/Field'
import { Spinner } from '../components/Spinner'
import { EventCard } from '../features/events/EventCard'
import { useUpcomingEvents } from '../features/events/queries'
import { describeError } from '../lib/api/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function EventsPage() {
  useDocumentTitle('Eventos')
  const { data, isPending, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useUpcomingEvents()
  const [city, setCity] = useState('')

  const events = useMemo(() => data?.pages.flat() ?? [], [data])
  const visible = useMemo(() => {
    const wanted = normalize(city.trim())
    return wanted ? events.filter((event) => normalize(event.city).includes(wanted)) : events
  }, [events, city])

  return (
    <div className="page page-section">
      <header className="page-head">
        <h1 className="page-head__title">Próximos eventos</h1>
        <p className="page-head__lead">Eventos publicados que ainda não começaram, do mais próximo ao mais distante.</p>
      </header>

      {events.length > 0 ? (
        <div className="filters">
          <TextField
            label="Filtrar por cidade"
            placeholder="Ex.: Recife"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>
      ) : null}

      {isPending ? (
        <Spinner label="Buscando eventos…" />
      ) : isError ? (
        <EmptyState
          title="Não conseguimos carregar os eventos"
          action={<Button onClick={() => refetch()}>Tentar de novo</Button>}
        >
          {describeError(error)}
        </EmptyState>
      ) : events.length === 0 ? (
        <EmptyState
          title="Nenhum evento aberto no momento"
          action={<ButtonLink to="/cadastro/ong">Cadastrar minha ONG</ButtonLink>}
        >
          Quando uma ONG publicar um evento, ele aparece aqui.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title={`Nada em “${city.trim()}” por enquanto`}
          action={
            <Button variant="secondary" onClick={() => setCity('')}>
              Ver todas as cidades
            </Button>
          }
        >
          Nenhum dos eventos carregados fica nessa cidade.
        </EmptyState>
      ) : (
        <>
          <div className="event-grid">
            {visible.map((event) => (
              <EventCard key={event.eventId} event={event} />
            ))}
          </div>
          {hasNextPage ? (
            <div className="load-more">
              <Button variant="secondary" busy={isFetchingNextPage} onClick={() => fetchNextPage()}>
                Carregar mais eventos
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
