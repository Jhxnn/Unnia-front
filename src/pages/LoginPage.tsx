import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button'
import { FormError, TextField } from '../components/Field'
import { useSession } from '../features/auth/useSession'
import { signIn } from '../lib/api/client'
import { ApiError, RateLimitError, describeError, isApiError } from '../lib/api/errors'
import { safeNext } from '../lib/formErrors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

function loginMessage(error: unknown): string {
  if (error instanceof RateLimitError) return describeError(error)
  if (error instanceof ApiError && error.status === 401) {
    // a API usa a mesma resposta para e-mail inexistente e senha errada; a conta suspensa tem texto próprio
    return error.message === 'Conta suspensa'
      ? 'Esta conta está suspensa. Fale com a equipe do Unnia.'
      : 'E-mail ou senha incorretos.'
  }
  return describeError(error)
}

export function LoginPage() {
  useDocumentTitle('Entrar')
  const { status } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={next} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate(next, { replace: true })
    } catch (caught) {
      // 403 no login quer dizer que a senha está certa, mas o e-mail ainda não foi confirmado
      if (isApiError(caught, 403)) {
        navigate(`/confirme-seu-email?email=${encodeURIComponent(email.trim())}`, { replace: true })
        return
      }
      setError(loginMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Entrar</h1>
      </header>
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <FormError message={error} />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <div className="form-foot">
          <Button type="submit" size="lg" busy={busy} disabled={!email || !password}>
            Entrar
          </Button>
        </div>
      </form>
      <p className="form-aside">
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </div>
  )
}
