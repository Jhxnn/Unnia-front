import { Button, ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useMe } from '../features/auth/useMe'
import { EventCard } from '../features/events/EventCard'
import { useMyEvents } from '../features/events/queries'
import { describeError } from '../lib/api/errors'
import type { VerificationStatus } from '../lib/api/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

const VERIFICATION_NOTICE: Record<Exclude<VerificationStatus, 'VERIFIED'>, string> = {
  PENDING:
    'A equipe do Unnia ainda está verificando sua ONG. Você já pode criar eventos como rascunho e publicá-los assim que a verificação for aprovada.',
  REJECTED: 'A verificação da sua ONG não foi aprovada, então ela não pode publicar eventos. Fale com a equipe do Unnia.',
}

export function NgoEventsPage() {
  useDocumentTitle('Meus eventos')
  const { me } = useMe()
  const { data, isPending, isError, error, refetch } = useMyEvents(true)
  const verification = me?.verificationStatus

  return (
    <div className="page page-section">
      <header className="page-head">
        <h1 className="page-head__title">Meus eventos</h1>
        {me?.name ? <p className="page-head__lead">{me.name}</p> : null}
        <div className="page-actions">
          <ButtonLink to="/ong/eventos/novo">Criar evento</ButtonLink>
        </div>
      </header>

      {verification && verification !== 'VERIFIED' ? (
        <p className="notice notice--info notice--spaced" role="status">
          {VERIFICATION_NOTICE[verification]}
        </p>
      ) : null}

      {isPending ? (
        <Spinner label="Buscando seus eventos…" />
      ) : isError ? (
        <EmptyState
          title="Não conseguimos carregar seus eventos"
          action={<Button onClick={() => refetch()}>Tentar de novo</Button>}
        >
          {describeError(error)}
        </EmptyState>
      ) : data.length === 0 ? (
        <EmptyState title="Você ainda não criou nenhum evento" action={<ButtonLink to="/ong/eventos/novo">Criar o primeiro evento</ButtonLink>}>
          Defina data, local e quantas vagas há. Você salva como rascunho e publica quando estiver pronto.
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
