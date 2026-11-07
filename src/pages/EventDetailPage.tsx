import { useParams } from 'react-router'
import { Button, ButtonLink } from '../components/Button'
import { ConfirmButton } from '../components/ConfirmButton'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useMe } from '../features/auth/useMe'
import { eventActions, eventPhase } from '../features/events/eventPolicy'
import { PhaseBadge } from '../features/events/PhaseBadge'
import {
  useEvent,
  useEventAction,
  useMyRegistrations,
  useOrganizer,
} from '../features/events/queries'
import { RegistrantsSection } from '../features/events/RegistrantsSection'
import { SlotCaption, SlotStrip } from '../features/events/SlotStrip'
import { eventsApi } from '../lib/api/endpoints'
import { describeError, isApiError } from '../lib/api/errors'
import type { EventView } from '../lib/api/types'
import { formatFullDate, formatPeriod } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'
import './event-detail.css'

const CLOSED_TEXT: Record<string, string> = {
  draft: 'Este evento ainda é um rascunho e não está aberto a inscrições.',
  ongoing: 'O evento já começou, então as inscrições estão encerradas.',
  ended: 'Este evento já terminou.',
  cancelled: 'Este evento foi cancelado pela organização.',
}

function SignUpPanel({ event }: { event: EventView }) {
  const { me } = useMe()
  const registrations = useMyRegistrations(me?.role === 'VOLUNTEER')
  const isRegistered = registrations.data?.some((registered) => registered.eventId === event.eventId) ?? false
  const now = useNow()
  const phase = eventPhase(event, now)
  const actions = eventActions({ event, me, isRegistered, now })

  const register = useEventAction(eventsApi.register, 'Inscrição confirmada. Sua vaga está reservada.')
  const cancelRegistration = useEventAction(eventsApi.cancelRegistration, 'Inscrição cancelada. A vaga foi liberada.')
  const publish = useEventAction(eventsApi.publish, 'Evento publicado. Já aceita inscrições.')
  const cancelEvent = useEventAction(eventsApi.cancel, 'Evento cancelado. Os inscritos foram avisados.')
  const finish = useEventAction(eventsApi.finish, 'Evento encerrado.')

  const loginTarget = `/entrar?next=${encodeURIComponent(`/eventos/${event.eventId}`)}`

  return (
    <aside className="signup" aria-label="Vagas e inscrição">
      <p className="signup__label">Vagas</p>
      <SlotStrip capacity={event.capacity} occupied={event.occupiedSpots} size="lg" />
      <SlotCaption capacity={event.capacity} occupied={event.occupiedSpots} />

      <div className="signup__actions">
        {actions.register === 'login' ? (
          <ButtonLink size="lg" to={loginTarget}>
            Entrar para se inscrever
          </ButtonLink>
        ) : null}

        {actions.register === 'available' ? (
          <Button size="lg" busy={register.isPending} onClick={() => register.mutate(event.eventId)}>
            Inscrever-se
          </Button>
        ) : null}

        {actions.register === 'full' ? (
          <Button size="lg" disabled>
            Evento lotado
          </Button>
        ) : null}

        {actions.register === 'registered' ? (
          <p className="signup__done">Você está inscrito neste evento.</p>
        ) : null}

        {actions.canCancelRegistration ? (
          <ConfirmButton
            label="Cancelar inscrição"
            confirmLabel="Sim, cancelar minha vaga"
            busy={cancelRegistration.isPending}
            onConfirm={() => cancelRegistration.mutate(event.eventId)}
          />
        ) : null}

        {actions.register === 'closed' ? <p className="signup__note">{CLOSED_TEXT[phase]}</p> : null}
        {actions.viewer === 'other' ? (
          <p className="signup__note">Contas de ONG e de administração não se inscrevem em eventos.</p>
        ) : null}
      </div>

      {actions.viewer === 'owner' ? (
        <div className="signup__manage">
          <p className="signup__label">Gerenciar evento</p>
          {actions.owner.publishBlockedByVerification ? (
            <p className="signup__note">
              Você pode publicar este rascunho assim que a equipe do Unnia verificar sua ONG.
            </p>
          ) : null}
          {actions.owner.canPublish ? (
            <Button
              variant="vest"
              disabled={actions.owner.publishBlockedByVerification}
              busy={publish.isPending}
              onClick={() => publish.mutate(event.eventId)}
            >
              Publicar evento
            </Button>
          ) : null}
          {actions.owner.canFinish ? (
            <Button variant="secondary" busy={finish.isPending} onClick={() => finish.mutate(event.eventId)}>
              Encerrar evento
            </Button>
          ) : null}
          {actions.owner.canCancel ? (
            <ConfirmButton
              label="Cancelar evento"
              confirmLabel="Sim, cancelar o evento"
              busy={cancelEvent.isPending}
              onConfirm={() => cancelEvent.mutate(event.eventId)}
            />
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const { data: event, isPending, isError, error, refetch } = useEvent(eventId)
  const now = useNow()
  const organizer = useOrganizer(event?.ownerId)
  useDocumentTitle(event?.title)

  if (isPending) {
    return <Spinner label="Abrindo o evento…" />
  }
  if (isError) {
    return (
      <EmptyState
        title={isApiError(error, 404) ? 'Evento não encontrado' : 'Não conseguimos abrir o evento'}
        action={
          isApiError(error, 404) ? (
            <ButtonLink to="/eventos">Ver outros eventos</ButtonLink>
          ) : (
            <Button onClick={() => refetch()}>Tentar de novo</Button>
          )
        }
      >
        {isApiError(error, 404)
          ? 'O endereço pode estar errado, ou o evento ainda é um rascunho da organização.'
          : describeError(error)}
      </EmptyState>
    )
  }

  const phase = eventPhase(event, now)
  return (
    <div className="page page-section detail">
      <div className="detail__main">
        <div className="detail__badges">
          <PhaseBadge phase={phase} />
        </div>
        <h1 className="detail__title">{event.title}</h1>
        {organizer.data ? <p className="detail__org">Organizado por {organizer.data.name}</p> : null}

        <dl className="facts">
          <div className="facts__item">
            <dt>Quando</dt>
            <dd>
              <span className="facts__strong">{formatFullDate(event.start)}</span>
              <span className="mono facts__sub">{formatPeriod(event.start, event.end)}</span>
            </dd>
          </div>
          <div className="facts__item">
            <dt>Onde</dt>
            <dd>
              <span className="facts__strong">{event.address}</span>
              <span className="facts__sub">{event.city}</span>
            </dd>
          </div>
        </dl>

        {event.description ? (
          <section aria-label="Sobre o evento">
            <h2 className="detail__about">Sobre o evento</h2>
            <p className="detail__description">{event.description}</p>
          </section>
        ) : null}

        <RegistrantsSection event={event} />
      </div>

      <SignUpPanel event={event} />
    </div>
  )
}
