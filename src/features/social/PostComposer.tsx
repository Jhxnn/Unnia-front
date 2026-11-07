import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { TextArea } from '../../components/Field'
import type { EventView } from '../../lib/api/types'

export const MAX_POST_LENGTH = 2000

interface Props {
  busy: boolean
  /** Eventos que a ONG pode divulgar na postagem; vazio para voluntários. */
  events: EventView[]
  onSubmit: (input: { text: string; linkedEventId?: string }) => void
}

export function PostComposer({ busy, events, onSubmit }: Props) {
  const [text, setText] = useState('')
  const [eventId, setEventId] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit({ text: trimmed, linkedEventId: eventId || undefined })
    setText('')
    setEventId('')
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <TextArea
        label="O que você quer compartilhar?"
        rows={3}
        maxLength={MAX_POST_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="composer__foot">
        {events.length > 0 ? (
          <div className="field composer__event">
            <label className="field__label" htmlFor="composer-event">
              Divulgar um evento
            </label>
            <select
              id="composer-event"
              className="field__control"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
            >
              <option value="">Nenhum</option>
              {events.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button type="submit" busy={busy} disabled={!text.trim()}>
          Publicar
        </Button>
      </div>
    </form>
  )
}
