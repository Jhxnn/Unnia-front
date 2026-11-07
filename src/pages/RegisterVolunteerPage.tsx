import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { FormError, TextArea, TextField } from '../components/Field'
import { useToast } from '../components/useToast'
import { signIn } from '../lib/api/client'
import { authApi } from '../lib/api/endpoints'
import { formErrorsFrom, type FormErrors } from '../lib/formErrors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

const PASSWORD_HINT = 'Pelo menos 8 caracteres, com letras e números.'

export function RegisterVolunteerPage() {
  useDocumentTitle('Conta de voluntário')
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({ name: '', email: '', password: '', city: '', bio: '' })
  const [errors, setErrors] = useState<FormErrors>({ fields: {}, form: null })
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setErrors({ fields: {}, form: null })
    try {
      const email = form.email.trim()
      await authApi.registerVolunteer({ ...form, email, name: form.name.trim(), city: form.city.trim() })
      await signIn(email, form.password)
      toast.success('Conta criada. Veja os eventos abertos e reserve sua vaga.')
      navigate('/eventos', { replace: true })
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
          label="Cidade"
          autoComplete="address-level2"
          value={form.city}
          error={errors.fields.city}
          onChange={(event) => set('city')(event.target.value)}
          required
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
