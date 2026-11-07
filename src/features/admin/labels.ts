import type { ReportReason, ReportTargetType, VerificationStatus } from '../../lib/api/types'

export const VERIFICATION_TABS: { status: VerificationStatus; label: string }[] = [
  { status: 'PENDING', label: 'Pendentes' },
  { status: 'VERIFIED', label: 'Verificadas' },
  { status: 'REJECTED', label: 'Recusadas' },
]

export const EMPTY_NGO_MESSAGE: Record<VerificationStatus, string> = {
  PENDING: 'Nenhuma ONG aguardando verificação.',
  VERIFIED: 'Nenhuma ONG verificada ainda.',
  REJECTED: 'Nenhuma ONG recusada.',
}

export const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: 'Spam',
  ABUSE: 'Ofensa',
  FRAUD: 'Golpe',
  INAPPROPRIATE_CONTENT: 'Conteúdo impróprio',
  OTHER: 'Outro motivo',
}

export const TARGET_LABEL: Record<ReportTargetType, string> = {
  POST: 'Postagem',
  COMMENT: 'Comentário',
  ACCOUNT: 'Conta',
}

/** O que "agir" significa depende do alvo: conteúdo é removido, conta é suspensa. */
export const TAKEDOWN_LABEL: Record<ReportTargetType, { action: string; confirm: string; done: string }> = {
  POST: { action: 'Remover postagem', confirm: 'Confirmar remoção', done: 'Postagem removida.' },
  COMMENT: { action: 'Remover comentário', confirm: 'Confirmar remoção', done: 'Comentário removido.' },
  ACCOUNT: { action: 'Suspender conta', confirm: 'Confirmar suspensão', done: 'Conta suspensa.' },
}
