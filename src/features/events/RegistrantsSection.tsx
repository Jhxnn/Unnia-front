import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { describeError } from '../../lib/api/errors'
import type { EventView } from '../../lib/api/types'
import { useNow } from '../../lib/useNow'
import { useMe } from '../auth/useMe'
import { eventActions } from './eventPolicy'
import { RegistrantsList } from './RegistrantsList'
import { useRecordAttendance, useRegistrants } from './queries'
import './registrants.css'

/**
 * Inscritos do evento, só para a ONG dona. Para os demais (visitantes, voluntários, outras ONGs)
 * não renderiza nada nem chama a API, que responderia 403.
 */
export function RegistrantsSection({ event }: { event: EventView }) {
  const { me } = useMe()
  const now = useNow()
  const actions = eventActions({ event, me, isRegistered: false, now })
  const visible = actions.owner.canSeeRegistrants

  const registrants = useRegistrants(event.eventId, visible)
  const recordAttendance = useRecordAttendance(event.eventId)

  if (!visible) return null

  return (
    <section className="registrants-section" aria-label="Inscritos">
      <h2 className="registrants-section__title">Inscritos</h2>
      {registrants.isPending ? (
        <Spinner label="Buscando os inscritos…" />
      ) : registrants.isError ? (
        <div className="registrants__error" role="alert">
          <p>{describeError(registrants.error)}</p>
          <Button variant="secondary" onClick={() => registrants.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <RegistrantsList
          registrants={registrants.data}
          canRecordAttendance={actions.owner.canRecordAttendance}
          recordingVolunteerId={recordAttendance.isPending ? recordAttendance.variables : null}
          onRecordAttendance={(volunteerId) => recordAttendance.mutate(volunteerId)}
        />
      )}
    </section>
  )
}
