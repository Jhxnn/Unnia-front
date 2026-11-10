import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { TextArea } from '../../components/Field'
import type { EventView, MediaRef } from '../../lib/api/types'
import { ACCEPTED_IMAGE_TYPES, MAX_POST_IMAGES, imageProblem } from './images'

export const MAX_POST_LENGTH = 2000

interface Attached {
  url: string
  name: string
}

interface Props {
  busy: boolean
  /** Eventos que a ONG pode divulgar na postagem; vazio para voluntários. */
  events: EventView[]
  onSubmit: (input: { text: string; linkedEventId?: string; media?: MediaRef[] }) => void
  /** Envia uma imagem e devolve a URL. Sem isto, o botão de imagem não aparece. */
  onUpload?: (file: File) => Promise<string>
}

export function PostComposer({ busy, events, onSubmit, onUpload }: Props) {
  const [text, setText] = useState('')
  const [eventId, setEventId] = useState('')
  const [images, setImages] = useState<Attached[]>([])
  const [uploading, setUploading] = useState(0)
  const [imageError, setImageError] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)

  async function handleFiles(change: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(change.target.files ?? [])
    change.target.value = '' // permite escolher o mesmo arquivo de novo depois de removê-lo
    if (!onUpload || files.length === 0) return
    setImageError(null)

    const room = MAX_POST_IMAGES - images.length
    if (files.length > room) {
      setImageError(`Cada postagem aceita até ${MAX_POST_IMAGES} imagens.`)
    }
    for (const file of files.slice(0, Math.max(room, 0))) {
      const problem = imageProblem(file)
      if (problem) {
        setImageError(`${file.name}: ${problem}`)
        continue
      }
      setUploading((count) => count + 1)
      try {
        const url = await onUpload(file)
        setImages((current) => [...current, { url, name: file.name }])
      } catch {
        // o motivo (limite, formato, armazenamento fora do ar) já foi mostrado em aviso por quem enviou
      } finally {
        setUploading((count) => count - 1)
      }
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || uploading > 0) return
    onSubmit({
      text: trimmed,
      linkedEventId: eventId || undefined,
      media: images.length > 0 ? images.map((image) => ({ url: image.url, type: 'IMAGE' as const })) : undefined,
    })
    setText('')
    setEventId('')
    setImages([])
    setImageError(null)
  }

  const atLimit = images.length >= MAX_POST_IMAGES

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <TextArea
        label="O que você quer compartilhar?"
        rows={3}
        maxLength={MAX_POST_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      {images.length > 0 || uploading > 0 ? (
        <ul className="composer__images" aria-label="Imagens da postagem">
          {images.map((image) => (
            <li key={image.url} className="composer__image">
              <img src={image.url} alt={image.name} />
              <button
                type="button"
                className="composer__remove"
                aria-label={`Remover imagem ${image.name}`}
                onClick={() => setImages((current) => current.filter((item) => item.url !== image.url))}
              >
                ×
              </button>
            </li>
          ))}
          {uploading > 0 ? (
            <li className="composer__image composer__image--loading" role="status">
              Enviando…
            </li>
          ) : null}
        </ul>
      ) : null}
      {imageError ? (
        <p className="field__error" role="alert">
          {imageError}
        </p>
      ) : null}

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
        {onUpload ? (
          <>
            <input
              ref={picker}
              type="file"
              hidden
              multiple
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              aria-label="Escolher imagens"
              onChange={handleFiles}
            />
            <Button variant="secondary" disabled={atLimit || uploading > 0} onClick={() => picker.current?.click()}>
              Adicionar imagem
            </Button>
          </>
        ) : null}
        <Button type="submit" busy={busy} disabled={!text.trim() || uploading > 0}>
          Publicar
        </Button>
      </div>
    </form>
  )
}
