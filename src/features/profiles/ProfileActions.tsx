import { ButtonLink, Button } from '../../components/Button'
import { ReportButton } from '../moderation/ReportButton'
import { useFollowStatus, useToggleFollow } from '../social/queries'
import { useSession } from '../auth/useSession'
import { pluralize } from '../../lib/format'

interface Props {
  accountId: string
  name: string
}

/**
 * Seguir, mandar mensagem e denunciar o perfil. Visitantes veem um convite para entrar; ninguém vê
 * essas ações no próprio perfil.
 */
export function ProfileActions({ accountId, name }: Props) {
  const { status, session } = useSession()
  const signedIn = status === 'authenticated'
  const own = session?.accountId === accountId
  const follow = useFollowStatus(accountId, signedIn && !own)
  const toggle = useToggleFollow(accountId)

  if (own) {
    return (
      <ButtonLink variant="secondary" to="/perfil">
        Editar meu perfil
      </ButtonLink>
    )
  }
  if (!signedIn) {
    return (
      <ButtonLink to={`/entrar?next=${encodeURIComponent(window.location.pathname)}`}>
        Entrar para seguir e conversar
      </ButtonLink>
    )
  }

  const following = follow.data?.following ?? false
  return (
    <>
      <Button
        variant={following ? 'secondary' : 'primary'}
        busy={toggle.isPending}
        disabled={follow.isPending}
        aria-pressed={following}
        onClick={() => toggle.mutate(!following)}
      >
        {following ? 'Seguindo' : 'Seguir'}
      </Button>
      <ButtonLink
        variant="secondary"
        to={`/mensagens?para=${accountId}&nome=${encodeURIComponent(name)}`}
      >
        Enviar mensagem
      </ButtonLink>
      <ReportButton targetType="ACCOUNT" targetId={accountId} label="Denunciar perfil" />
      {follow.data ? (
        <span className="profile-head__followers">{pluralize(follow.data.followers, 'seguidor', 'seguidores')}</span>
      ) : null}
    </>
  )
}
