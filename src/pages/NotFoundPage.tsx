import { ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')
  return (
    <EmptyState title="Página não encontrada" action={<ButtonLink to="/eventos">Ver eventos</ButtonLink>}>
      O endereço pode ter mudado ou estar digitado errado.
    </EmptyState>
  )
}
