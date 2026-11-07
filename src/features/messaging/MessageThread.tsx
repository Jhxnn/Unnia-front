import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import type { MessageView } from '../../lib/api/types'
import { formatShort } from '../../lib/format'

export const MAX_MESSAGE_LENGTH = 2000

interface Props {
  /** Da mais antiga para a mais nova; a API devolve o contrário, quem chama inverte. */
  messages: MessageView[]
  viewerAccountId: string
  busy: boolean
  onSend: (text: string) => void
}

export function MessageThread({ messages, viewerAccountId, busy, onSend }: Props) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  // a conversa abre (e continua) no fim, onde está o que foi dito por último
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="thread-pane">
      <ol className="bubbles" aria-label="Mensagens">
        {messages.length === 0 ? <li className="bubbles__empty">Escreva a primeira mensagem.</li> : null}
        {messages.map((message) => {
          const mine = message.senderId === viewerAccountId
          return (
            <li key={message.messageId} className={mine ? 'bubble bubble--mine' : 'bubble'}>
              <p className="bubble__text">{message.text}</p>
              <span className="bubble__meta">{formatShort(message.sentAt)}</span>
            </li>
          )
        })}
        <div ref={endRef} />
      </ol>

      <form className="message-form" onSubmit={handleSubmit}>
        <input
          className="field__control"
          aria-label="Escreva uma mensagem"
          placeholder="Escreva uma mensagem"
          maxLength={MAX_MESSAGE_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" busy={busy} disabled={!text.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  )
}
