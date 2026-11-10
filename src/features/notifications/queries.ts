import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/useToast'
import { notificationsApi } from '../../lib/api/endpoints'
import { describeError } from '../../lib/api/errors'

// o canal de tempo real (SSE) avisa na hora; esta consulta é só a rede de segurança
const UNREAD_REFRESH_MS = 60_000
export const NOTIFICATIONS_PAGE_SIZE = 50

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
}

/** Quantidade de notificações não lidas, para o sino. Atualiza sozinha, já que a API não empurra novidades. */
export function useUnreadNotifications(enabled: boolean): number {
  const { data } = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: notificationsApi.unreadCount,
    enabled,
    refetchInterval: UNREAD_REFRESH_MS,
  })
  return data?.count ?? 0
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ signal }) => notificationsApi.list(0, NOTIFICATIONS_PAGE_SIZE, signal),
  })
}

function useNotificationMutation<TInput>(action: (input: TInput) => Promise<void>, successMessage?: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      if (successMessage) toast.success(successMessage)
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (error) => toast.error(describeError(error)),
  })
}

export function useMarkNotificationRead() {
  return useNotificationMutation((notificationId: string) => notificationsApi.markRead(notificationId))
}

export function useMarkAllNotificationsRead() {
  return useNotificationMutation(() => notificationsApi.markAllRead(), 'Tudo marcado como lido.')
}
