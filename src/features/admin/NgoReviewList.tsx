import { Button } from '../../components/Button'
import { ConfirmButton } from '../../components/ConfirmButton'
import type { NgoReview } from '../../lib/api/types'
import { formatPlace } from '../../lib/format'

interface Props {
  ngos: NgoReview[]
  /** Id da ONG com uma ação em andamento; bloqueia os botões dela. */
  busyNgoId: string | null
  onVerify: (ngo: NgoReview) => void
  onReject: (ngo: NgoReview) => void
  onSuspend: (ngo: NgoReview) => void
  onActivate: (ngo: NgoReview) => void
}

/** Fichas das ONGs para decidir: o que a ONG diz de si, o CNPJ e o e-mail de contato. */
export function NgoReviewList({ ngos, busyNgoId, onVerify, onReject, onSuspend, onActivate }: Props) {
  return (
    <ul className="dossiers">
      {ngos.map((ngo) => {
        const busy = busyNgoId === ngo.ngoId
        const suspended = ngo.accountStatus === 'SUSPENDED'
        return (
          <li key={ngo.ngoId} className="dossier">
            <div className="dossier__body">
              <h3 className="dossier__title">
                {ngo.name}
                {suspended ? <span className="chip chip--stamp">Conta suspensa</span> : null}
              </h3>
              <p className="dossier__meta">
                <span className="mono">{ngo.cnpj}</span>
                <span>{formatPlace(ngo.city, ngo.state)}</span>
                <span>{ngo.email}</span>
              </p>
              <p className="dossier__text">{ngo.description}</p>
            </div>

            <div className="dossier__actions">
              {ngo.verificationStatus !== 'VERIFIED' ? (
                <Button busy={busy} onClick={() => onVerify(ngo)} aria-label={`Verificar ${ngo.name}`}>
                  Verificar
                </Button>
              ) : null}
              {ngo.verificationStatus !== 'REJECTED' ? (
                <ConfirmButton
                  label="Recusar"
                  confirmLabel="Confirmar recusa"
                  busy={busy}
                  onConfirm={() => onReject(ngo)}
                />
              ) : null}
              {suspended ? (
                <Button variant="secondary" busy={busy} onClick={() => onActivate(ngo)}>
                  Reativar conta
                </Button>
              ) : (
                <ConfirmButton
                  label="Suspender conta"
                  confirmLabel="Confirmar suspensão"
                  busy={busy}
                  onConfirm={() => onSuspend(ngo)}
                />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
