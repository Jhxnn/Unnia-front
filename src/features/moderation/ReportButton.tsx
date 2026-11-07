import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { TextArea } from '../../components/Field'
import { useToast } from '../../components/useToast'
import { reportsApi } from '../../lib/api/endpoints'
import { describeError } from '../../lib/api/errors'
import type { ReportReason, ReportTargetType } from '../../lib/api/types'
import { useSession } from '../auth/useSession'
import { REASON_LABEL } from '../admin/labels'
import './report.css'

const REASONS: ReportReason[] = ['SPAM', 'ABUSE', 'FRAUD', 'INAPPROPRIATE_CONTENT', 'OTHER']

interface Props {
  targetType: ReportTargetType
  targetId: string
  label?: string
}

/**
 * Denúncia em duas etapas: o botão abre um formulário curto (motivo e, se quiser, detalhes).
 * Só aparece para quem está logado, que é quem a API aceita como denunciante.
 */
export function ReportButton({ targetType, targetId, label = 'Denunciar' }: Props) {
  const { status } = useSession()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('SPAM')
  const [details, setDetails] = useState('')

  const report = useMutation({
    mutationFn: () => reportsApi.file(targetType, targetId, reason, details),
    onSuccess: () => {
      toast.success('Denúncia enviada. A equipe vai analisar.')
      setOpen(false)
      setDetails('')
    },
    onError: (error) => toast.error(describeError(error)),
  })

  if (status !== 'authenticated') return null

  if (!open) {
    return (
      <Button variant="quiet" onClick={() => setOpen(true)}>
        {label}
      </Button>
    )
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    report.mutate()
  }

  return (
    <form className="report" onSubmit={handleSubmit} aria-label="Denunciar">
      <div className="field">
        <label className="field__label" htmlFor={`report-reason-${targetId}`}>
          Motivo
        </label>
        <select
          id={`report-reason-${targetId}`}
          className="field__control"
          value={reason}
          onChange={(event) => setReason(event.target.value as ReportReason)}
        >
          {REASONS.map((item) => (
            <option key={item} value={item}>
              {REASON_LABEL[item]}
            </option>
          ))}
        </select>
      </div>
      <TextArea
        label="Detalhes (opcional)"
        rows={2}
        maxLength={500}
        value={details}
        onChange={(event) => setDetails(event.target.value)}
      />
      <div className="report__actions">
        <Button type="submit" busy={report.isPending}>
          Enviar denúncia
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
