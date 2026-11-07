import { Button } from '../../components/Button'
import type { Registrant } from '../../lib/api/types'
import { formatShort } from '../../lib/format'
import './registrants.css'

interface Props {
  registrants: Registrant[]
  /** O evento já começou e está publicado: dá para registrar presença. */
  canRecordAttendance: boolean
  /** Voluntário cuja presença está sendo registrada agora. */
  recordingVolunteerId?: string | null
  onRecordAttendance: (volunteerId: string) => void
}

/** A lista de presença do evento: quem se inscreveu e quem já compareceu. */
export function RegistrantsList({ registrants, canRecordAttendance, recordingVolunteerId, onRecordAttendance }: Props) {
  if (registrants.length === 0) {
    return <p className="registrants__empty">Ninguém se inscreveu ainda. As inscrições aparecem aqui assim que chegarem.</p>
  }

  const attended = registrants.filter((registrant) => registrant.status === 'ATTENDED').length
  return (
    <>
      <p className="registrants__summary">
        <span className="mono">{registrants.length}</span> {registrants.length === 1 ? 'inscrito' : 'inscritos'}
        {attended > 0 ? (
          <>
            {' · '}
            <span className="mono">{attended}</span> {attended === 1 ? 'presença' : 'presenças'}
          </>
        ) : null}
      </p>
      <ul className="registrants">
        {registrants.map((registrant) => (
          <li key={registrant.volunteerId} className="registrant">
            <span
              className={`registrant__mark ${registrant.status === 'ATTENDED' ? 'registrant__mark--present' : ''}`}
              aria-hidden="true"
            />
            <div className="registrant__who">
              <span className="registrant__name">{registrant.name}</span>
              <span className="registrant__meta">
                {registrant.city ? (
                  <>
                    <span>{registrant.city}</span>
                    <span aria-hidden="true">·</span>
                  </>
                ) : null}
                <span className="mono">inscrito em {formatShort(registrant.registeredAt)}</span>
              </span>
            </div>
            {registrant.status === 'ATTENDED' ? (
              <span className="registrant__present">Presença registrada</span>
            ) : canRecordAttendance ? (
              <Button
                variant="secondary"
                busy={recordingVolunteerId === registrant.volunteerId}
                onClick={() => onRecordAttendance(registrant.volunteerId)}
                aria-label={`Registrar presença de ${registrant.name}`}
              >
                Registrar presença
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {!canRecordAttendance && attended < registrants.length ? (
        <p className="registrants__note">A presença pode ser registrada quando o evento começar.</p>
      ) : null}
    </>
  )
}
