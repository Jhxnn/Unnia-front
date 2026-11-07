import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { FormError, TextArea, TextField } from '../components/Field'
import { useToast } from '../components/useToast'
import { AddressFields } from '../features/address/AddressFields'
import { EMPTY_ADDRESS, hasAddressErrors, validateAddress, type AddressErrors } from '../features/address/address'
import { authApi } from '../lib/api/endpoints'
import { formErrorsFrom, type FormErrors } from '../lib/formErrors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

const PASSWORD_HINT = 'Pelo menos 8 caracteres, com letras e números.'

export function RegisterVolunteerPage() {
  useDocumentTitle('Conta de voluntário')
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({ name: '', email: '', password: '', bio: '' })
  const [confirm, setConfirm] = useState('')
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({})
  const [errors, setErrors] = useState<FormErrors>({ fields: {}, form: null })
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({ fields: {}, form: null })
    if (form.password !== confirm) {
      setErrors({ fields: { confirm: 'A confirmação precisa ser igual à senha.' }, form: null })
      return
    }
    const found = validateAddress(address, 'region', true)
    setAddressErrors(found)
    if (hasAddressErrors(found)) return
    setBusy(true)
    try {
      const email = form.email.trim()
      await authApi.registerVolunteer({
        ...form,
        email,
        name: form.name.trim(),
        city: address.city.trim(),
        state: address.state,
        cep: address.cep,
      })
      toast.success('Conta criada. Falta só confirmar o e-mail.')
      navigate(`/confirme-seu-email?email=${encodeURIComponent(email)}`, { replace: true })
    } catch (caught) {
      setErrors(formErrorsFrom(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Conta de voluntário</h1>
      </header>
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <FormError message={errors.form} />
        <TextField
          label="Nome"
          autoComplete="name"
          value={form.name}
          error={errors.fields.name}
          onChange={(event) => set('name')(event.target.value)}
          required
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={form.email}
          error={errors.fields.email}
          onChange={(event) => set('email')(event.target.value)}
          required
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          value={form.password}
          error={errors.fields.password}
          onChange={(event) => set('password')(event.target.value)}
          required
        />
        <TextField
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={errors.fields.confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
        <AddressFields
          mode="region"
          value={address}
          onChange={setAddress}
          errors={{ ...addressErrors, city: addressErrors.city ?? errors.fields.city }}
        />
        <TextArea
          label="Sobre você (opcional)"
          hint="Conte em poucas linhas como gostaria de ajudar."
          value={form.bio}
          error={errors.fields.bio}
          onChange={(event) => set('bio')(event.target.value)}
        />
        <div className="form-foot">
          <Button type="submit" size="lg" busy={busy}>
            Criar conta
          </Button>
        </div>
      </form>
      <p className="form-aside">
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </div>
  )
}
