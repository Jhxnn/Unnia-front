import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { FormError, TextArea, TextField } from '../components/Field'
import { useToast } from '../components/useToast'
import { AddressFields } from '../features/address/AddressFields'
import {
  EMPTY_ADDRESS,
  composeAddressLine,
  hasAddressErrors,
  validateAddress,
  type AddressErrors,
} from '../features/address/address'
import { eventKeys } from '../features/events/queries'
import { eventsApi } from '../lib/api/endpoints'
import { formErrorsFrom, type FormErrors } from '../lib/formErrors'
import { localInputToIso, toLocalInput } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

/** Sugestão inicial: daqui a uma semana, no início da próxima hora cheia. */
function defaultStart(): Date {
  const date = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return date
}

export function NewEventPage() {
  useDocumentTitle('Novo evento')
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const start = defaultStart()
  const [form, setForm] = useState({
    title: '',
    description: '',
    start: toLocalInput(start),
    end: toLocalInput(new Date(start.getTime() + 4 * 3600 * 1000)),
    capacity: '20',
  })
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({})
  const [errors, setErrors] = useState<FormErrors>({ fields: {}, form: null })
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({ fields: {}, form: null })

    const found = validateAddress(address, 'full', true)
    setAddressErrors(found)
    if (hasAddressErrors(found)) return

    const capacity = Number(form.capacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      setErrors({ fields: { capacity: 'Informe pelo menos 1 vaga.' }, form: null })
      return
    }
    if (!form.start || !form.end || new Date(form.end) <= new Date(form.start)) {
      setErrors({ fields: { end: 'O fim precisa ser depois do início.' }, form: null })
      return
    }

    setBusy(true)
    try {
      const { eventId } = await eventsApi.create({
        title: form.title.trim(),
        description: form.description,
        address: composeAddressLine(address),
        city: address.city.trim(),
        state: address.state,
        cep: address.cep,
        start: localInputToIso(form.start),
        end: localInputToIso(form.end),
        capacity,
      })
      await queryClient.invalidateQueries({ queryKey: eventKeys.all })
      toast.success('Rascunho criado. Publique quando estiver pronto.')
      navigate(`/eventos/${eventId}`)
    } catch (caught) {
      setErrors(formErrorsFrom(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Novo evento</h1>
        <p className="page-head__lead">O evento é salvo como rascunho. Ele só aparece para os voluntários depois de publicado.</p>
      </header>
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <FormError message={errors.form} />
        <TextField
          label="Título"
          value={form.title}
          error={errors.fields.title}
          onChange={(event) => set('title')(event.target.value)}
          required
        />
        <TextArea
          label="Descrição"
          hint="O que vai acontecer, o que levar e quem pode participar."
          value={form.description}
          error={errors.fields.description}
          onChange={(event) => set('description')(event.target.value)}
        />
        <AddressFields
          mode="full"
          value={address}
          onChange={setAddress}
          errors={{
            ...addressErrors,
            street: addressErrors.street ?? errors.fields.address,
            city: addressErrors.city ?? errors.fields.city,
          }}
        />
        <div className="form-row">
          <TextField
            label="Início"
            type="datetime-local"
            value={form.start}
            error={errors.fields.start}
            onChange={(event) => set('start')(event.target.value)}
            required
          />
          <TextField
            label="Fim"
            type="datetime-local"
            value={form.end}
            error={errors.fields.end}
            onChange={(event) => set('end')(event.target.value)}
            required
          />
        </div>
        <TextField
          label="Vagas"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={form.capacity}
          error={errors.fields.capacity}
          onChange={(event) => set('capacity')(event.target.value)}
          required
        />
        <div className="form-foot">
          <Button type="submit" size="lg" busy={busy}>
            Salvar rascunho
          </Button>
          <Link to="/ong/eventos">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
