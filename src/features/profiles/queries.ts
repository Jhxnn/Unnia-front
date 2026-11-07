import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/useToast'
import { authApi, profilesApi } from '../../lib/api/endpoints'
import { describeError } from '../../lib/api/errors'
import type { UpdateNgoInput, UpdateVolunteerInput } from '../../lib/api/types'
import { meKey } from '../auth/useMe'
import { useSession } from '../auth/useSession'

export const NGOS_PAGE_SIZE = 12

/** Vitrine das ONGs verificadas, paginada ("Carregar mais"). */
export function useNgoShowcase() {
  return useInfiniteQuery({
    queryKey: ['ngos', 'showcase'],
    queryFn: ({ pageParam, signal }) => profilesApi.ngos(pageParam, NGOS_PAGE_SIZE, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === NGOS_PAGE_SIZE ? allPages.length : undefined),
  })
}

export function useVolunteer(volunteerId: string | undefined) {
  return useQuery({
    queryKey: ['volunteer', volunteerId],
    queryFn: () => profilesApi.volunteer(volunteerId as string),
    enabled: Boolean(volunteerId),
    staleTime: 60_000,
  })
}

/** Salva o perfil do próprio usuário e renova tudo que mostra o nome dele. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { session } = useSession()
  return useMutation({
    mutationFn: (input: { kind: 'NGO'; data: UpdateNgoInput } | { kind: 'VOLUNTEER'; data: UpdateVolunteerInput }) =>
      input.kind === 'NGO' ? profilesApi.updateNgo(input.data) : profilesApi.updateVolunteer(input.data),
    onSuccess: async () => {
      toast.success('Perfil atualizado.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meKey(session?.accountId) }),
        queryClient.invalidateQueries({ queryKey: ['ngo'] }),
        queryClient.invalidateQueries({ queryKey: ['ngos'] }),
        queryClient.invalidateQueries({ queryKey: ['volunteer'] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ])
    },
    onError: (error) => toast.error(describeError(error)),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => authApi.changePassword(current, next),
  })
}
