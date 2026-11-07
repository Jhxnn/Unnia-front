import { Link } from 'react-router'
import type { NotificationView } from '../../lib/api/types'
import { timeAgo } from '../../lib/format'
import { notificationTarget } from './target'

interface Props {
  notifications: NotificationView[]
  now: Date
  /** Chamado ao abrir uma notificação ainda não lida, para marcá-la como lida. */
  onOpen: (notification: NotificationView) => void
}

export function NotificationList({ notifications, now, onOpen }: Props) {
  return (
    <ul className="notifications">
      {notifications.map((notification) => {
        const target = notificationTarget(notification)
        const body = (
          <>
            <span className="notification__dot" aria-hidden="true" />
            <span className="notification__text">
              <span className="notification__title">{notification.text}</span>
              <span className="notification__when">{timeAgo(notification.createdAt, now)}</span>
            </span>
            {!notification.read ? <span className="visually-hidden">Não lida</span> : null}
          </>
        )
        const className = notification.read ? 'notification' : 'notification notification--unread'
        return (
          <li key={notification.notificationId}>
            {target ? (
              <Link to={target} className={className} onClick={() => !notification.read && onOpen(notification)}>
                {body}
              </Link>
            ) : (
              <button
                type="button"
                className={`${className} notification--button`}
                disabled={notification.read}
                onClick={() => onOpen(notification)}
              >
                {body}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
