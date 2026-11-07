import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { FormError, TextArea, TextField } from '../components/Field'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/useToast'
import { useMe } from '../features/auth/useMe'
import { useOrganizer } from '../features/events/queries'
import { useChangePassword, useUpdateProfile, useVolunteer } from '../features/profiles/queries'
import { signOut } from '../lib/api/client'
import { formErrorsFrom, type FormErrors } from '../lib/formErrors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import '../features/profiles/profiles.css'
import './page.css'

const NO_ERRORS: FormErrors = { fields: {}, form: null }

function ProfileForm({
  kind,
  initial,
}: {
  kind: 'NGO' | 'VOLUNTEER'
  initial: { name: string; about: string; city: string }
}) {
  const update = useUpdateProfile()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS)
  const aboutLabel = kind === 'NGO' ? 'Sobre a ONG' : 'Sobre você'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors(NO_ERRORS)
    const data = { name: form.name.trim(), city: form.city.trim() }
    try {
      if (kind === 'NGO') await update.mutateAsync({ kind, data: { ...data, description: form.about } })
      else await update.mutateAsync({ kind, data: { ...data, bio: form.about } })
    } catch (caught) {
      setErrors(formErrorsFrom(caught))
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate>
      <TextField
        label="Nome"
        value={form.name}
        error={errors.fields.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        required
      />
      <TextField
        label="Cidade"
        value={form.city}
        error={errors.fields.city}
        onChange={(event) => setForm({ ...form, city: event.target.value })}
        required
      />
      <TextArea
        label={aboutLabel}
        value={form.about}
        error={errors.fields.description ?? errors.fields.bio}
        onChange={(event) => setForm({ ...form, about: event.target.value })}
      />
      <FormError message={errors.form} />
      <div className="form-foot">
        <Button type="submit" busy={update.isPending}>
          Salvar perfil
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const change = useChangePassword()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors(NO_ERRORS)
    if (form.next !== form.confirm) {
      setErrors({ fields: { confirm: 'A confirmação precisa ser igual à nova senha.' }, form: null })
      return
    }
    try {
      await change.mutateAsync({ current: form.current, next: form.next })
    } catch (caught) {
      const parsed = formErrorsFrom(caught)
      setErrors(
        parsed.form && /atual/i.test(parsed.form)
          ? { fields: { current: parsed.form }, form: null }
          : parsed,
      )
      return
    }
    // a troca encerra todas as sessões da conta, inclusive esta
    await signOut()
    queryClient.clear()
    toast.success('Senha alterada. Entre novamente com a nova senha.')
    navigate('/entrar', { replace: true })
  }

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate>
      <TextField
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        value={form.current}
        error={errors.fields.current}
        onChange={(event) => setForm({ ...form, current: event.target.value })}
        required
      />
      <TextField
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint="Use pelo menos 8 caracteres."
        value={form.next}
        error={errors.fields.newPassword ?? errors.fields.password}
        onChange={(event) => setForm({ ...form, next: event.target.value })}
        required
      />
      <TextField
        label="Repita a nova senha"
        type="password"
        autoComplete="new-password"
        value={form.confirm}
        error={errors.fields.confirm}
        onChange={(event) => setForm({ ...form, confirm: event.target.value })}
        required
      />
      <FormError message={errors.form} />
      <div className="form-foot">
        <Button type="submit" busy={change.isPending}>
          Trocar senha
        </Button>
        <span className="form-aside">Por segurança, você precisará entrar de novo.</span>
      </div>
    </form>
  )
}

/** Perfil de ONG ou de voluntário já carregado, para o formulário nascer com os valores atuais. */
function OwnProfile({ kind, profileId }: { kind: 'NGO' | 'VOLUNTEER'; profileId: string }) {
  const ngo = useOrganizer(kind === 'NGO' ? profileId : undefined)
  const volunteer = useVolunteer(kind === 'VOLUNTEER' ? profileId : undefined)
  const query = kind === 'NGO' ? ngo : volunteer

  if (query.isPending) return <Spinner label="Buscando seu perfil…" />
  if (query.isError || !query.data) return <p className="notice notice--error">Não foi possível carregar seu perfil.</p>

  const data = query.data
  const about = 'description' in data ? data.description : data.bio
  return <ProfileForm kind={kind} initial={{ name: data.name, city: data.city, about }} />
}

export function EditProfilePage() {
  useDocumentTitle('Meu perfil')
  const { me, isLoading } = useMe()

  if (isLoading || !me) return <Spinner label="Buscando seu perfil…" />

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Meu perfil</h1>
        <p className="page-head__lead">{me.email}</p>
      </header>

      <div className="settings">
        {me.role !== 'ADMIN' && me.profileId ? (
          <section aria-label="Dados do perfil">
            <h2 className="settings__title">Dados do perfil</h2>
            <OwnProfile kind={me.role === 'NGO' ? 'NGO' : 'VOLUNTEER'} profileId={me.profileId} />
          </section>
        ) : null}

        <section aria-label="Senha">
          <h2 className="settings__title">Senha</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  )
}
