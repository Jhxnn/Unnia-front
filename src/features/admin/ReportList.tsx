import { Button } from '../../components/Button'
import { ConfirmButton } from '../../components/ConfirmButton'
import { formatShort } from '../../lib/format'
import type { ReportView } from '../../lib/api/types'
import { REASON_LABEL, TAKEDOWN_LABEL, TARGET_LABEL } from './labels'

interface Props {
  reports: ReportView[]
  busyReportId: string | null
  onTakeDown: (report: ReportView) => void
  onDismiss: (report: ReportView) => void
}

/** Fila de denúncias: o que foi denunciado, por quê, e as duas decisões possíveis. */
export function ReportList({ reports, busyReportId, onTakeDown, onDismiss }: Props) {
  return (
    <ul className="dossiers">
      {reports.map((report) => {
        const busy = busyReportId === report.reportId
        const takedown = TAKEDOWN_LABEL[report.target.type]
        return (
          <li key={report.reportId} className="dossier">
            <div className="dossier__body">
              <p className="dossier__meta dossier__meta--head">
                <span className="chip chip--blue">{REASON_LABEL[report.reason]}</span>
                <span className="dossier__kind">{TARGET_LABEL[report.target.type]}</span>
                <span>{formatShort(report.createdAt)}</span>
              </p>
              {report.targetSummary ? (
                <blockquote className="dossier__quote">{report.targetSummary}</blockquote>
              ) : (
                <p className="dossier__text dossier__text--gone">O conteúdo denunciado não existe mais.</p>
              )}
              {report.details ? <p className="dossier__text">“{report.details}”</p> : null}
            </div>

            <div className="dossier__actions">
              <ConfirmButton
                label={takedown.action}
                confirmLabel={takedown.confirm}
                busy={busy}
                onConfirm={() => onTakeDown(report)}
              />
              <Button variant="secondary" busy={busy} onClick={() => onDismiss(report)}>
                Descartar denúncia
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
