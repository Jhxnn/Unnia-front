import { Link } from 'react-router'
import { ButtonLink } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { EventCard } from '../features/events/EventCard'
import { useUpcomingEvents } from '../features/events/queries'
import { SlotCaption, SlotStrip } from '../features/events/SlotStrip'
import { describeError } from '../lib/api/errors'
import type { EventView } from '../lib/api/types'
import { dateParts } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './home.css'

/** O próximo evento, com a fileira de vagas em escala grande: a tese visual da página. */
function NextEventSheet({ event }: { event: EventView }) {
  const date = dateParts(event.start)
  return (
    <article className="sheet">
      <div className="sheet__head">
        <p className="sheet__label">Próximo evento</p>
        <p className="sheet__when mono">
          {date.weekday} {date.day} {date.month} · {date.time}
        </p>
      </div>
      <h2 className="sheet__title">
        <Link to={`/eventos/${event.eventId}`} className="sheet__link">
          {event.title}
        </Link>
      </h2>
      <p className="sheet__where">{event.city}</p>
      <SlotStrip capacity={event.capacity} occupied={event.occupiedSpots} size="xl" />
      <div className="sheet__foot">
        <SlotCaption capacity={event.capacity} occupied={event.occupiedSpots} />
        <ButtonLink variant="vest" to={`/eventos/${event.eventId}`}>
          Ver evento
        </ButtonLink>
      </div>
    </article>
  )
}

function EmptySheet() {
  return (
    <article className="sheet sheet--empty">
      <p className="sheet__label">Nenhum evento aberto agora</p>
      <h2 className="sheet__title">As vagas ainda estão em branco.</h2>
      <p className="sheet__where">Quando uma ONG publicar um evento, ele aparece aqui.</p>
      <SlotStrip capacity={24} occupied={0} size="xl" />
      <div className="sheet__foot">
        <ButtonLink variant="vest" to="/cadastro/ong">
          Cadastrar minha ONG
        </ButtonLink>
      </div>
    </article>
  )
}

export function HomePage() {
  useDocumentTitle()
  const { data, isPending, isError, error } = useUpcomingEvents()
  const events = data?.pages.flat() ?? []
  const [next, ...others] = events
  const rest = others.slice(0, 6)

  return (
    <>
      <section className="page hero">
        <h1 className="hero__title">
          Onde ONGs abrem <span className="marker">vagas</span> e voluntários aparecem.
        </h1>
        <p className="hero__lead">
          Veja os próximos eventos solidários, reserve sua vaga em um clique e converse direto com quem organiza.
        </p>
        <div className="hero__actions">
          <ButtonLink size="lg" to="/eventos">
            Ver eventos
          </ButtonLink>
          <ButtonLink size="lg" variant="secondary" to="/cadastro/ong">
            Cadastrar minha ONG
          </ButtonLink>
        </div>
      </section>

      <section className="page hero-sheet" aria-label="Próximo evento">
        {isPending ? (
          <Spinner label="Buscando o próximo evento…" />
        ) : isError ? (
          <p className="notice notice--error" role="alert">
            {describeError(error)}
          </p>
        ) : next ? (
          <NextEventSheet event={next} />
        ) : (
          <EmptySheet />
        )}
      </section>

      {rest.length > 0 ? (
        <section className="page page-section">
          <div className="section-head">
            <h2 className="section-head__title">Também abertos</h2>
            <Link to="/eventos" className="section-head__more">
              Ver todos os eventos
            </Link>
          </div>
          <div className="event-grid">
            {rest.map((event) => (
              <EventCard key={event.eventId} event={event} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="page page-section audiences">
        <div className="audience">
          <h2 className="audience__title">Para ONGs</h2>
          <p>Publique o evento, defina quantas vagas há e acompanhe as inscrições encher a lista em tempo real.</p>
          <ButtonLink variant="secondary" to="/cadastro/ong">
            Cadastrar minha ONG
          </ButtonLink>
        </div>
        <div className="audience">
          <h2 className="audience__title">Para voluntários</h2>
          <p>Escolha onde ajudar, garanta sua vaga e converse com a organização antes do dia.</p>
          <ButtonLink variant="secondary" to="/cadastro/voluntario">
            Criar conta de voluntário
          </ButtonLink>
        </div>
      </section>
    </>
  )
}
