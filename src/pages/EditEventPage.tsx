import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Button, ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { FormError, TextArea, TextField } from '../components/Field'
import { Spinner } from '../components/Spinner'
import { useMe } from '../features/auth/useMe'
import { eventActions } from '../features/events/eventPolicy'
import { useEvent, useEventEdit } from '../features/events/queries'
import { eventsApi } from '../lib/api/endpoints'
import type { EventView } from '../lib/api/types'
import { formErrorsFrom, type FormErrors } from '../lib/formErrors'
import { localInputToIso, pluralize, toLocalInput } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useNow } from '../lib/useNow'
import './page.css'

const NO_ERRORS: FormErrors = { fields: {}, form: null }

function DetailsForm({ event }: { event: EventView }) {
  const save = useEventEdit(
    (input: { title: string; description: string; address: string; city: string }) =>
      eventsApi.update(event.eventId, input),
    'Detalhes atualizados.',
  )
  const [form, setForm] = useState({
    title: event.title,
    description: event.description,
    address: event.address,
    city: event.city,
  })
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS)

  async function handleSubmit(submit: FormEvent) {
    submit.preventDefault()
    setErrors(NO_ERRORS)
    try {
      await save.mutateAsync({
        title: form.title.trim(),
        description: form.description,
        address: form.address.trim(),
        city: form.city.trim(),
      })
    } catch (caught) {
      setErrors(formErrorsFrom(caught))
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate aria-label="Detalhes do evento">
      <FormError message={errors.form} />
      <TextField
        label="Título"
        value={form.title}
        error={errors.fields.title}
        onChange={(change) => setForm({ ...form, title: change.target.value })}
        required
      />
      <TextArea
        label="Descrição"
        value={form.description}
        error={errors.fields.description}
        onChange={(change) => setForm({ ...form, description: change.target.value })}
      />
      <TextField
        label="Endereço"
        value={form.address}
        error={errors.fields.address}
        onChange={(change) => setForm({ ...form, address: change.target.value })}
        required
      />
      <TextField
        label="Cidade"
        value={form.city}
        error={errors.fields.city}
        onChange={(change) => setForm({ ...form, city: change.target.value })}
        required
      />
      <div className="form-foot">
        <Button type="submit" busy={save.isPending}>
          Salvar detalhes
        </Button>
      </div>
    </form>
  )
}

function ScheduleForm({ event }: { event: EventView }) {
  const save = useEventEdit(
    (input: { start: string; end: string }) => eventsApi.reschedule(event.eventId, input.start, input.end),
    'Horário atualizado.',
  )
  const [form, setForm] = useState({
    start: toLocalInput(new Date(event.start)),
    end: toLocalInput(new Date(event.end)),
  })
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS)

  async function handleSubmit(submit: FormEvent) {
    submit.preventDefault()
    setErrors(NO_ERRORS)
    if (!form.start || !form.end || new Date(form.end) <= new Date(form.start)) {
      setErrors({ fields: { end: 'O fim precisa ser depois do início.' }, form: null })
      return
    }
    try {
      await save.mutateAsync({ start: localInputToIso(form.start), end: localInputToIso(form.end) })
    } catch (caught) {
      setErrors(formErrorsFrom(caught))
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate aria-label="Horário do evento">
      <FormError message={errors.form} />
      <div className="form-row">
        <TextField
          label="Início"
          type="datetime-local"
          value={form.start}
          error={errors.fields.start}
          onChange={(change) => setForm({ ...form, start: change.target.value })}
          required
        />
        <TextField
          label="Fim"
          type="datetime-local"
          value={form.end}
          error={errors.fields.end}
          onChange={(change) => setForm({ ...form, end: change.target.value })}
          required
        />
      </div>
      {event.occupiedSpots > 0 ? (
        <p className="form-aside">
          {pluralize(event.occupiedSpots, 'pessoa inscrita será avisada', 'pessoas inscritas serão avisadas')} da
          mudança.
        </p>
      ) : null}
      <div className="form-foot">
        <Button type="submit" busy={save.isPending}>
          Remarcar
        </Button>
      </div>
    </form>
  )
}

function CapacityForm({ event }: { event: EventView }) {
  const save = useEventEdit(
    (capacity: number) => eventsApi.changeCapacity(event.eventId, capacity),
    'Vagas atualizadas.',
  )
  const [capacity, setCapacity] = useState(String(event.capacity))
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS)

  async function handleSubmit(submit: FormEvent) {
    submit.preventDefault()
    setErrors(NO_ERRORS)
    const value = Number(capacity)
    if (!Number.isInteger(value) || value < 1) {
      setErrors({ fields: { capacity: 'Informe pelo menos 1 vaga.' }, form: null })
      return
    }
    if (value < event.occupiedSpots) {
      setErrors({
        fields: { capacity: `Já há ${pluralize(event.occupiedSpots, 'inscrito', 'inscritos')}: as vagas não podem ser menos que isso.` },
        form: null,
      })
      return
    }
    try {
      await save.mutateAsync(value)
    } catch (caught) {
      setErrors(formErrorsFrom(caught))
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate aria-label="Vagas do evento">
      <FormError message={errors.form} />
      <TextField
        label="Vagas"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        hint={`${pluralize(event.occupiedSpots, 'vaga ocupada', 'vagas ocupadas')} no momento.`}
        value={capacity}
        error={errors.fields.capacity}
        onChange={(change) => setCapacity(change.target.value)}
        required
      />
      <div className="form-foot">
        <Button type="submit" busy={save.isPending}>
          Salvar vagas
        </Button>
      </div>
    </form>
  )
}

export function EditEventPage() {
  const { eventId = '' } = useParams()
  const { me, isLoading } = useMe()
  const now = useNow()
  const event = useEvent(eventId)
  useDocumentTitle(event.data ? `Editar ${event.data.title}` : 'Editar evento')

  if (isLoading || event.isPending) return <Spinner label="Buscando o evento…" />

  const allowed = event.data
    ? eventActions({ event: event.data, me, isRegistered: false, now }).owner
    : null
  if (event.isError || !event.data || !allowed?.canEdit) {
    return (
      <div className="page page-section">
        <EmptyState title="Este evento não pode ser editado" action={<ButtonLink to="/ong/eventos">Meus eventos</ButtonLink>}>
          Só a ONG dona edita, e só enquanto o evento não foi cancelado nem encerrado.
        </EmptyState>
      </div>
    )
  }

  const current = event.data
  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Editar evento</h1>
        <p className="page-head__lead">
          <Link to={`/eventos/${current.eventId}`}>Voltar para “{current.title}”</Link>
        </p>
      </header>

      <div className="settings">
        <section aria-label="Detalhes">
          <h2 className="settings__title">Detalhes</h2>
          <DetailsForm event={current} />
        </section>
        {allowed.canReschedule ? (
          <section aria-label="Horário">
            <h2 className="settings__title">Horário</h2>
            <ScheduleForm event={current} />
          </section>
        ) : null}
        <section aria-label="Vagas">
          <h2 className="settings__title">Vagas</h2>
          <CapacityForm event={current} />
        </section>
      </div>
    </div>
  )
}
