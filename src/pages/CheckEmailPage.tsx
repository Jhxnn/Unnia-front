import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button'
import { TextField } from '../components/Field'
import { useToast } from '../components/useToast'
import { authApi } from '../lib/api/endpoints'
import { describeError } from '../lib/api/errors'
import { useCountdown } from '../lib/useCountdown'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

/** O backend ignora pedidos de reenvio feitos em menos de 1 minuto; a tela espera o mesmo tempo. */
export const RESEND_WAIT_SECONDS = 60
export const CODE_LENGTH = 6

/**
 * "Confirme seu e-mail": para onde vão quem acabou de se cadastrar e quem tentou entrar sem ter confirmado.
 * A pessoa digita o código de 6 números que chegou por e-mail. O e-mail vem na URL (`?email=`); se faltar, ela o
 * digita aqui mesmo.
 */
export function CheckEmailPage() {
  useDocumentTitle('Confirme seu e-mail')
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromUrl = params.get('email')?.trim() ?? ''
  const [typed, setTyped] = useState('')
  const [code, setCode] = useState('')
  const email = fromUrl || typed.trim()
  const { remaining, start } = useCountdown()

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(email, code),
    onSuccess: () => {
      toast.success('E-mail confirmado. Agora é só entrar.')
      navigate('/entrar', { replace: true })
    },
  })

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(email),
    onSuccess: () => {
      toast.success('Pronto. Se houver uma conta com esse e-mail, enviamos um código novo.')
      setCode('')
      verify.reset()
      start(RESEND_WAIT_SECONDS)
    },
    onError: (error) => toast.error(describeError(error)),
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (email && code.length === CODE_LENGTH) verify.mutate()
  }

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Confirme seu e-mail</h1>
        <p className="page-head__lead">
          {fromUrl ? (
            <>
              Enviamos um código de {CODE_LENGTH} números para <strong>{fromUrl}</strong>. Digite-o abaixo para ativar
              sua conta.
            </>
          ) : (
            'Para entrar, confirme o e-mail da sua conta com o código que enviamos. Se não o encontra, peça um novo aqui.'
          )}
        </p>
      </header>

      <form className="form-card" onSubmit={handleSubmit} noValidate>
        {!fromUrl ? (
          <TextField
            label="E-mail da conta"
            type="email"
            autoComplete="email"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            required
          />
        ) : null}
        <TextField
          label="Código de confirmação"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={CODE_LENGTH}
          hint="Os 6 números do e-mail. O código vale por 15 minutos."
          error={verify.isError ? describeError(verify.error) : undefined}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          required
        />
        <p className="form-aside">Não chegou? Olhe a caixa de spam ou peça um código novo.</p>
        <div className="form-foot">
          <Button type="submit" busy={verify.isPending} disabled={!email || code.length !== CODE_LENGTH}>
            Confirmar e-mail
          </Button>
          <Button
            variant="secondary"
            busy={resend.isPending}
            disabled={!email || remaining > 0}
            onClick={() => resend.mutate()}
          >
            {remaining > 0 ? `Reenviar em ${remaining} s` : 'Reenviar código'}
          </Button>
        </div>
      </form>
    </div>
  )
}
