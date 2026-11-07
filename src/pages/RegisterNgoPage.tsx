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

export function RegisterNgoPage() {
  useDocumentTitle('Cadastrar ONG')
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({ name: '', cnpj: '', email: '', password: '', city: '', description: '' })
  const [errors, setErrors] = useState<FormErrors>({ fields: {}, form: null })
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setErrors({ fields: {}, form: null })
    try {
      const email = form.email.trim()
      await authApi.registerNgo({ ...form, email, name: form.name.trim(), city: form.city.trim() })
      await signIn(email, form.password)
      toast.success('ONG cadastrada. Você já pode criar rascunhos; publicar depende da verificação.')
      navigate('/ong/eventos', { replace: true })
    } catch (caught) {
      setErrors(formErrorsFrom(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Cadastrar minha ONG</h1>
        <p className="page-head__lead">
          Depois do cadastro, a equipe do Unnia verifica o CNPJ. Até lá você cria eventos como rascunho; ao ser
          verificada, a ONG passa a publicar.
        </p>
      </header>
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <FormError message={errors.form} />
        <TextField
          label="Nome da ONG"
          value={form.name}
          error={errors.fields.name}
          onChange={(event) => set('name')(event.target.value)}
          required
        />
        <TextField
          label="CNPJ"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          value={form.cnpj}
          error={errors.fields.cnpj}
          onChange={(event) => set('cnpj')(event.target.value)}
          required
        />
        <TextField
          label="E-mail de acesso"
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
          hint="Pelo menos 8 caracteres, com letras e números."
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
          label="Sobre a ONG (opcional)"
          hint="O que a organização faz e quem ela atende."
          value={form.description}
          error={errors.fields.description}
          onChange={(event) => set('description')(event.target.value)}
        />
        <div className="form-foot">
          <Button type="submit" size="lg" busy={busy}>
            Cadastrar ONG
          </Button>
        </div>
      </form>
      <p className="form-aside">
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </div>
  )
}
