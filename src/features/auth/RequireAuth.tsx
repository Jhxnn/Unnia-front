import { Navigate, Outlet, useLocation } from 'react-router'
import { Spinner } from '../../components/Spinner'
import type { Role } from '../../lib/api/types'
import { useSession } from './useSession'

/**
 * Guarda de rota. Visitantes vão para o login (e voltam depois); quem está logado com outro papel
 * volta para a página inicial.
 */
export function RequireAuth({ role }: { role?: Role }) {
  const { status, session } = useSession()
  const location = useLocation()

  if (status === 'restoring') {
    return <Spinner label="Entrando…" />
  }
  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/entrar?next=${next}`} replace />
  }
  if (role && session?.role !== role) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
