import { useParams } from 'react-router'
import { ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useVolunteer } from '../features/profiles/queries'
import { ProfileActions } from '../features/profiles/ProfileActions'
import { ProfileHeader } from '../features/profiles/ProfileHeader'
import { AuthorPosts } from '../features/social/AuthorPosts'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import '../features/profiles/profiles.css'
import './page.css'
import { formatPlace } from '../lib/format'

export function VolunteerProfilePage() {
  const { volunteerId = '' } = useParams()
  const volunteer = useVolunteer(volunteerId)
  useDocumentTitle(volunteer.data?.name ?? 'Voluntário')

  if (volunteer.isPending) return <Spinner label="Buscando o perfil…" />
  if (volunteer.isError) {
    return (
      <div className="page page-section">
        <EmptyState title="Perfil não encontrado" action={<ButtonLink to="/eventos">Ver eventos</ButtonLink>}>
          O endereço pode estar errado ou a pessoa ter saído do Unnia.
        </EmptyState>
      </div>
    )
  }

  const profile = volunteer.data
  return (
    <div className="page page--narrow page-section">
      <ProfileHeader
        name={profile.name}
        role="VOLUNTEER"
        city={formatPlace(profile.city, profile.state)}
        about={profile.bio}
        badges={<span className="chip chip--vest">Voluntário</span>}
        actions={<ProfileActions accountId={profile.accountId} name={profile.name} />}
      />
      <AuthorPosts accountId={profile.accountId} />
    </div>
  )
}
