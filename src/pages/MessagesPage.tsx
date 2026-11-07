import { useEffect, useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useSession } from '../features/auth/useSession'
import { ConversationList } from '../features/messaging/ConversationList'
import { MessageThread } from '../features/messaging/MessageThread'
import {
  useConversations,
  useMarkConversationRead,
  useSendMessage,
  useThread,
} from '../features/messaging/queries'
import { describeError } from '../lib/api/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'
import '../features/messaging/messaging.css'
import './page.css'

/**
 * Caixa de entrada e conversa. Em `/mensagens?para=<conta>&nome=<nome>` abre uma conversa nova com a
 * pessoa (ou a que já existe), que é como o botão "Enviar mensagem" dos perfis chega aqui.
 */
export function MessagesPage() {
  useDocumentTitle('Mensagens')
  const { session } = useSession()
  const now = useNow()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [params] = useSearchParams()
  const toAccount = params.get('para')
  const toName = params.get('nome') ?? 'esta pessoa'

  const conversations = useConversations(true)
  const thread = useThread(conversationId)
  const markRead = useMarkConversationRead(conversationId)
  const send = useSendMessage((id) => navigate(`/mensagens/${id}`, { replace: true }))

  const list = useMemo(() => conversations.data ?? [], [conversations.data])
  const active = list.find((conversation) => conversation.conversationId === conversationId)
  const existingWithTarget = toAccount ? list.find((c) => c.otherAccountId === toAccount) : undefined
  const unread = active?.unreadCount ?? 0
  const markReadMutate = markRead.mutate

  useEffect(() => {
    if (conversationId && unread > 0) markReadMutate()
  }, [conversationId, unread, markReadMutate])

  if (!session) return null

  // "Enviar mensagem" para quem já tem conversa abre a conversa existente
  if (!conversationId && existingWithTarget) {
    return <Navigate to={`/mensagens/${existingWithTarget.conversationId}`} replace />
  }

  const startingNew = !conversationId && Boolean(toAccount) && !conversations.isPending
  const messages = [...(thread.data ?? [])].reverse()

  return (
    <div className="page page-section">
      <header className="page-head">
        <h1 className="page-head__title">Mensagens</h1>
      </header>

      <div className={conversationId || startingNew ? 'inbox inbox--open' : 'inbox'}>
        <aside className="inbox__list">
          {conversations.isPending ? (
            <Spinner label="Buscando as conversas…" />
          ) : conversations.isError ? (
            <p className="inbox__note">{describeError(conversations.error)}</p>
          ) : list.length === 0 ? (
            <p className="inbox__note">
              Você ainda não tem conversas. Abra o perfil de uma ONG e use “Enviar mensagem”.
            </p>
          ) : (
            <ConversationList conversations={list} activeId={conversationId} now={now} />
          )}
        </aside>

        <section className="inbox__thread" aria-label="Conversa">
          {conversationId ? (
            <>
              <header className="inbox__head">
                <Link to="/mensagens" className="inbox__back">
                  Voltar
                </Link>
                <h2>{active?.otherName ?? 'Conversa'}</h2>
              </header>
              {thread.isPending ? (
                <Spinner label="Buscando as mensagens…" />
              ) : thread.isError ? (
                <EmptyState title="Não foi possível abrir a conversa">{describeError(thread.error)}</EmptyState>
              ) : (
                <MessageThread
                  messages={messages}
                  viewerAccountId={session.accountId}
                  busy={send.isPending}
                  onSend={(text) => {
                    const recipientId = active?.otherAccountId
                    if (recipientId) send.mutate({ recipientId, text })
                  }}
                />
              )}
            </>
          ) : startingNew && toAccount ? (
            <>
              <header className="inbox__head">
                <Link to="/mensagens" className="inbox__back">
                  Voltar
                </Link>
                <h2>Nova conversa com {toName}</h2>
              </header>
              <MessageThread
                messages={[]}
                viewerAccountId={session.accountId}
                busy={send.isPending}
                onSend={(text) => send.mutate({ recipientId: toAccount, text })}
              />
            </>
          ) : (
            <p className="inbox__note inbox__note--center">Escolha uma conversa para ler e responder.</p>
          )}
        </section>
      </div>
    </div>
  )
}
