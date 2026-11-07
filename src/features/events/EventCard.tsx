import { Link } from 'react-router'
import type { EventView } from '../../lib/api/types'
import { dateParts, formatPlace } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { eventPhase } from './eventPolicy'
import { PhaseBadge } from './PhaseBadge'
import { SlotCaption, SlotStrip } from './SlotStrip'
import './events.css'

export function EventCard({ event }: { event: EventView }) {
  const now = useNow()
  const date = dateParts(event.start)
  const phase = eventPhase(event, now)
  return (
    <article className="event-card">
      <time className="event-card__date" dateTime={event.start}>
        <span className="event-card__weekday">{date.weekday}</span>
        <span className="event-card__day">{date.day}</span>
        <span className="event-card__month">{date.month}</span>
      </time>
      <div className="event-card__body">
        <div className="event-card__head">
          <h3 className="event-card__title">
            <Link to={`/eventos/${event.eventId}`} className="event-card__link">
              {event.title}
            </Link>
          </h3>
          <PhaseBadge phase={phase} />
        </div>
        <p className="event-card__meta">
          <span className="mono">{date.time}</span>
          <span aria-hidden="true">·</span>
          <span>{formatPlace(event.city, event.state)}</span>
        </p>
        <div className="event-card__slots">
          <SlotStrip capacity={event.capacity} occupied={event.occupiedSpots} />
          <SlotCaption capacity={event.capacity} occupied={event.occupiedSpots} />
        </div>
      </div>
    </article>
  )
}
