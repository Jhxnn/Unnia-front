import { Link } from 'react-router'
import type { ConversationView } from '../../lib/api/types'
import { timeAgo } from '../../lib/format'
import { Avatar } from '../social/AuthorLine'

interface Props {
  conversations: ConversationView[]
  activeId: string | undefined
  now: Date
}

export function ConversationList({ conversations, activeId, now }: Props) {
  return (
    <ul className="conversations" aria-label="Conversas">
      {conversations.map((conversation) => {
        const active = conversation.conversationId === activeId
        return (
          <li key={conversation.conversationId}>
            <Link
              to={`/mensagens/${conversation.conversationId}`}
              className={active ? 'conversation conversation--active' : 'conversation'}
              aria-current={active ? 'page' : undefined}
            >
              <Avatar name={conversation.otherName} role="UNKNOWN" />
              <span className="conversation__text">
                <span className="conversation__name">{conversation.otherName}</span>
                <span className="conversation__when">{timeAgo(conversation.lastActivityAt, now)}</span>
              </span>
              {conversation.unreadCount > 0 ? (
                <span className="badge" aria-label={`${conversation.unreadCount} não lidas`}>
                  {conversation.unreadCount}
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
