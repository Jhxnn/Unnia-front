import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/useToast'
import { adminApi } from '../../lib/api/endpoints'
import { describeError } from '../../lib/api/errors'
import type { VerificationStatus } from '../../lib/api/types'

export const ADMIN_PAGE_SIZE = 20

export const adminKeys = {
  all: ['admin'] as const,
  ngos: (status: VerificationStatus) => ['admin', 'ngos', status] as const,
  reports: ['admin', 'reports'] as const,
}

/** ONGs em uma situação de verificação, paginadas ("Carregar mais"). */
export function useNgoReviews(status: VerificationStatus) {
  return useInfiniteQuery({
    queryKey: adminKeys.ngos(status),
    queryFn: ({ pageParam, signal }) => adminApi.ngos(status, pageParam, ADMIN_PAGE_SIZE, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === ADMIN_PAGE_SIZE ? allPages.length : undefined),
  })
}

/** Denúncias abertas, da mais antiga para a mais nova. */
export function useOpenReports() {
  return useInfiniteQuery({
    queryKey: adminKeys.reports,
    queryFn: ({ pageParam, signal }) => adminApi.reports(pageParam, ADMIN_PAGE_SIZE, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === ADMIN_PAGE_SIZE ? allPages.length : undefined),
  })
}

/** Ação do painel (verificar, suspender, remover...) que avisa o resultado e atualiza as filas. */
export function useAdminAction<TInput>(action: (input: TInput) => Promise<void>, successMessage: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      toast.success(successMessage)
      return queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
    onError: (error) => toast.error(describeError(error)),
  })
}
