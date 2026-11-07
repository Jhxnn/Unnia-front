import { useQuery } from '@tanstack/react-query'
import { meApi } from '../../lib/api/endpoints'
import type { Me } from '../../lib/api/types'
import { useSession } from './useSession'

export const meKey = (accountId: string | undefined) => ['me', accountId] as const

/** Dados do usuário logado. `me` é nulo para visitantes e enquanto a sessão é restaurada. */
export function useMe(): { me: Me | null; isLoading: boolean } {
  const { status, session } = useSession()
  const query = useQuery({
    queryKey: meKey(session?.accountId),
    queryFn: meApi.get,
    enabled: status === 'authenticated',
    staleTime: 60_000,
  })
  return {
    me: status === 'authenticated' ? (query.data ?? null) : null,
    isLoading: status === 'restoring' || (status === 'authenticated' && query.isPending),
  }
}
