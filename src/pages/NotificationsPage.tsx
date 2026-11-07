import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { NotificationList } from '../features/notifications/NotificationList'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../features/notifications/queries'
import { describeError } from '../lib/api/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'
import '../features/notifications/notifications.css'
import './page.css'

export function NotificationsPage() {
  useDocumentTitle('Notificações')
  const now = useNow()
  const query = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const hasUnread = (query.data ?? []).some((notification) => !notification.read)

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Notificações</h1>
        {hasUnread ? (
          <div className="page-actions">
            <Button variant="secondary" busy={markAll.isPending} onClick={() => markAll.mutate(undefined)}>
              Marcar todas como lidas
            </Button>
          </div>
        ) : null}
      </header>

      {query.isPending ? (
        <Spinner label="Buscando as notificações…" />
      ) : query.isError ? (
        <EmptyState
          title="Não foi possível carregar as notificações"
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {describeError(query.error)}
        </EmptyState>
      ) : query.data.length === 0 ? (
        <EmptyState title="Nada por aqui ainda">
          Quando alguém se inscrever nos seus eventos, comentar, reagir ou te mandar uma mensagem, você vê aqui.
        </EmptyState>
      ) : (
        <NotificationList
          notifications={query.data}
          now={now}
          onOpen={(notification) => markRead.mutate(notification.notificationId)}
        />
      )}
    </div>
  )
}
