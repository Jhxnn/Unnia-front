import { useSearchParams } from 'react-router'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { adminApi } from '../lib/api/endpoints'
import { describeError } from '../lib/api/errors'
import type { NgoReview, ReportView, VerificationStatus } from '../lib/api/types'
import { EMPTY_NGO_MESSAGE, VERIFICATION_TABS } from '../features/admin/labels'
import { NgoReviewList } from '../features/admin/NgoReviewList'
import { ReportList } from '../features/admin/ReportList'
import { useAdminAction, useNgoReviews, useOpenReports } from '../features/admin/queries'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import '../features/admin/admin.css'
import './page.css'

type Tab = 'ongs' | 'denuncias'

function parseStatus(value: string | null): VerificationStatus {
  return VERIFICATION_TABS.find((tab) => tab.status === value)?.status ?? 'PENDING'
}

function LoadMore({ visible, loading, onClick }: { visible: boolean; loading: boolean; onClick: () => void }) {
  if (!visible) return null
  return (
    <div className="load-more">
      <Button variant="secondary" busy={loading} onClick={onClick}>
        Carregar mais
      </Button>
    </div>
  )
}

function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <EmptyState
      title="Não foi possível carregar a fila"
      action={
        <Button variant="secondary" onClick={onRetry}>
          Tentar de novo
        </Button>
      }
    >
      {describeError(error)}
    </EmptyState>
  )
}

function NgosTab({ status }: { status: VerificationStatus }) {
  const query = useNgoReviews(status)
  const verify = useAdminAction((ngo: NgoReview) => adminApi.verifyNgo(ngo.ngoId), 'ONG verificada.')
  const reject = useAdminAction((ngo: NgoReview) => adminApi.rejectNgo(ngo.ngoId), 'ONG recusada.')
  const suspend = useAdminAction((ngo: NgoReview) => adminApi.suspendAccount(ngo.accountId), 'Conta suspensa.')
  const activate = useAdminAction((ngo: NgoReview) => adminApi.activateAccount(ngo.accountId), 'Conta reativada.')
  const pending = [verify, reject, suspend, activate].find((mutation) => mutation.isPending)
  const busyNgoId = pending?.variables?.ngoId ?? null

  if (query.isPending) return <Spinner label="Buscando as ONGs…" />
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} />

  const ngos = query.data.pages.flat()
  if (ngos.length === 0) return <EmptyState title={EMPTY_NGO_MESSAGE[status]} />

  return (
    <>
      <NgoReviewList
        ngos={ngos}
        busyNgoId={busyNgoId}
        onVerify={(ngo) => verify.mutate(ngo)}
        onReject={(ngo) => reject.mutate(ngo)}
        onSuspend={(ngo) => suspend.mutate(ngo)}
        onActivate={(ngo) => activate.mutate(ngo)}
      />
      <LoadMore visible={query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
    </>
  )
}

function ReportsTab() {
  const query = useOpenReports()
  const takeDown = useAdminAction(
    (report: ReportView) => adminApi.resolveReport(report.reportId, true),
    'Denúncia resolvida.',
  )
  const dismiss = useAdminAction((report: ReportView) => adminApi.dismissReport(report.reportId), 'Denúncia descartada.')
  const busyReportId = (takeDown.isPending ? takeDown.variables : dismiss.isPending ? dismiss.variables : null)?.reportId

  if (query.isPending) return <Spinner label="Buscando as denúncias…" />
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} />

  const reports = query.data.pages.flat()
  if (reports.length === 0) {
    return <EmptyState title="Nenhuma denúncia aberta">Quando alguém denunciar um conteúdo, ele aparece aqui.</EmptyState>
  }

  return (
    <>
      <ReportList
        reports={reports}
        busyReportId={busyReportId ?? null}
        onTakeDown={(report) => takeDown.mutate(report)}
        onDismiss={(report) => dismiss.mutate(report)}
      />
      <LoadMore visible={query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
    </>
  )
}

export function AdminPage() {
  useDocumentTitle('Painel da equipe')
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('aba') === 'denuncias' ? 'denuncias' : 'ongs'
  const status = parseStatus(params.get('situacao'))

  function select(next: Tab, nextStatus: VerificationStatus = status) {
    const search = new URLSearchParams()
    if (next === 'denuncias') search.set('aba', 'denuncias')
    else if (nextStatus !== 'PENDING') search.set('situacao', nextStatus)
    setParams(search, { replace: true })
  }

  return (
    <div className="page page-section">
      <header className="page-head">
        <h1 className="page-head__title">Painel da equipe</h1>
        <p className="page-head__lead">
          Verifique as ONGs antes de elas publicarem eventos e decida o que fazer com as denúncias.
        </p>
      </header>

      <div className="tabs" role="group" aria-label="Seção do painel">
        <button type="button" className="tab" aria-pressed={tab === 'ongs'} onClick={() => select('ongs')}>
          ONGs
        </button>
        <button type="button" className="tab" aria-pressed={tab === 'denuncias'} onClick={() => select('denuncias')}>
          Denúncias
        </button>
      </div>

      {tab === 'ongs' ? (
        <>
          <div className="subtabs" role="group" aria-label="Situação da verificação">
            {VERIFICATION_TABS.map((item) => (
              <button
                key={item.status}
                type="button"
                className="subtab"
                aria-pressed={status === item.status}
                onClick={() => select('ongs', item.status)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <NgosTab status={status} />
        </>
      ) : (
        <ReportsTab />
      )}
    </div>
  )
}


