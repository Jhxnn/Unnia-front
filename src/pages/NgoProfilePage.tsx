import { useParams } from 'react-router'
import { ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useOrganizer } from '../features/events/queries'
import { ProfileActions } from '../features/profiles/ProfileActions'
import { ProfileHeader } from '../features/profiles/ProfileHeader'
import { AuthorPosts } from '../features/social/AuthorPosts'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import '../features/profiles/profiles.css'
import './page.css'
import { formatPlace } from '../lib/format'

export function NgoProfilePage() {
  const { ngoId = '' } = useParams()
  const ngo = useOrganizer(ngoId)
  useDocumentTitle(ngo.data?.name ?? 'ONG')

  if (ngo.isPending) return <Spinner label="Buscando a ONG…" />
  if (ngo.isError) {
    return (
      <div className="page page-section">
        <EmptyState title="ONG não encontrada" action={<ButtonLink to="/ongs">Ver todas as ONGs</ButtonLink>}>
          O endereço pode estar errado ou a ONG ter saído do Unnia.
        </EmptyState>
      </div>
    )
  }

  const profile = ngo.data
  const verified = profile.verificationStatus === 'VERIFIED'
  return (
    <div className="page page--narrow page-section">
      <ProfileHeader
        name={profile.name}
        role="NGO"
        city={formatPlace(profile.city, profile.state)}
        about={profile.description}
        badges={
          <span className={verified ? 'chip chip--ok' : 'chip chip--blue'}>
            {verified ? 'ONG verificada' : 'Aguardando verificação'}
          </span>
        }
        actions={<ProfileActions accountId={profile.accountId} name={profile.name} />}
      />
      <AuthorPosts accountId={profile.accountId} />
    </div>
  )
}
