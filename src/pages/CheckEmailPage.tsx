import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
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

/**
 * "Confirme seu e-mail": para onde vão quem acabou de se cadastrar e quem tentou entrar sem ter confirmado.
 * O e-mail vem na URL (`?email=`); se faltar, a pessoa o digita para pedir o reenvio.
 */
export function CheckEmailPage() {
  useDocumentTitle('Confirme seu e-mail')
  const toast = useToast()
  const [params] = useSearchParams()
  const fromUrl = params.get('email')?.trim() ?? ''
  const [typed, setTyped] = useState('')
  const email = fromUrl || typed.trim()
  const { remaining, start } = useCountdown()

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(email),
    onSuccess: () => {
      toast.success('Pronto. Se houver uma conta com esse e-mail, o link foi enviado de novo.')
      start(RESEND_WAIT_SECONDS)
    },
    onError: (error) => toast.error(describeError(error)),
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (email) resend.mutate()
  }

  return (
    <div className="page page--narrow page-section">
      <header className="page-head">
        <h1 className="page-head__title">Confirme seu e-mail</h1>
        <p className="page-head__lead">
          {fromUrl ? (
            <>
              Enviamos um link para <strong>{fromUrl}</strong>. Abra a mensagem e clique em “Confirmar meu e-mail” para
              ativar sua conta.
            </>
          ) : (
            'Para entrar, confirme o e-mail da sua conta pelo link que enviamos. Se não o encontra, peça um novo aqui.'
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
        <p className="form-aside">
          Não chegou? Olhe a caixa de spam. O link vale por 24 horas e só pode ser usado uma vez.
        </p>
        <div className="form-foot">
          <Button type="submit" busy={resend.isPending} disabled={!email || remaining > 0}>
            {remaining > 0 ? `Reenviar em ${remaining} s` : 'Reenviar e-mail'}
          </Button>
          <Link to="/entrar">Já confirmei: entrar</Link>
        </div>
      </form>
    </div>
  )
}
