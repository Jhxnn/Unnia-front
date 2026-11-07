import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { authApi } from '../lib/api/endpoints'
import { describeError } from '../lib/api/errors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './page.css'

/**
 * Destino do link do e-mail (`/verificar-email?token=...`). Confirma assim que abre. A confirmação é idempotente
 * no backend, então abrir o link duas vezes (ou o React rodar o efeito duas vezes) não causa erro.
 */
export function VerifyEmailPage() {
  useDocumentTitle('Confirmar e-mail')
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''

  const verification = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => authApi.verifyEmail(token).then(() => true),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  })

  if (!token) {
    return (
      <div className="page page-section">
        <EmptyState title="Link incompleto" action={<ButtonLink to="/confirme-seu-email">Pedir um novo link</ButtonLink>}>
          O endereço não traz o código de confirmação. Abra o link direto do e-mail, ou peça um novo.
        </EmptyState>
      </div>
    )
  }

  if (verification.isPending) {
    return <Spinner label="Confirmando seu e-mail…" />
  }

  if (verification.isError) {
    return (
      <div className="page page-section">
        <EmptyState title="Não foi possível confirmar" action={<ButtonLink to="/confirme-seu-email">Pedir um novo link</ButtonLink>}>
          {describeError(verification.error)}
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="page page-section">
      <EmptyState title="E-mail confirmado" action={<ButtonLink to="/entrar">Entrar</ButtonLink>}>
        Tudo certo: sua conta está ativa. Entre com seu e-mail e sua senha.
      </EmptyState>
    </div>
  )
}
