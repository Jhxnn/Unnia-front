import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/useToast'
import { messagesApi } from '../../lib/api/endpoints'
import { describeError } from '../../lib/api/errors'

const CONVERSATIONS_REFRESH_MS = 15_000
const THREAD_REFRESH_MS = 8_000

export const messagingKeys = {
  all: ['messaging'] as const,
  conversations: ['messaging', 'conversations'] as const,
  thread: (conversationId: string) => ['messaging', 'thread', conversationId] as const,
}

/** Caixa de entrada. Atualiza sozinha de tempos em tempos, já que a API não empurra novidades. */
export function useConversations(enabled: boolean) {
  return useQuery({
    queryKey: messagingKeys.conversations,
    queryFn: messagesApi.conversations,
    enabled,
    refetchInterval: CONVERSATIONS_REFRESH_MS,
  })
}

/** Total de mensagens não lidas, para o selo do menu. */
export function useUnreadMessages(enabled: boolean): number {
  const { data } = useConversations(enabled)
  return (data ?? []).reduce((total, conversation) => total + conversation.unreadCount, 0)
}

export function useThread(conversationId: string | undefined) {
  return useQuery({
    queryKey: messagingKeys.thread(conversationId ?? ''),
    queryFn: () => messagesApi.messages(conversationId as string),
    enabled: Boolean(conversationId),
    refetchInterval: THREAD_REFRESH_MS,
  })
}

/** Envia uma mensagem. Se for a primeira com a pessoa, a API cria a conversa e devolve o id dela. */
export function useSendMessage(onSent?: (conversationId: string) => void) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ recipientId, text }: { recipientId: string; text: string }) =>
      messagesApi.send(recipientId, text),
    onSuccess: async ({ conversationId }) => {
      await queryClient.invalidateQueries({ queryKey: messagingKeys.all })
      onSent?.(conversationId)
    },
    onError: (error) => toast.error(describeError(error)),
  })
}

export function useMarkConversationRead(conversationId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => messagesApi.markRead(conversationId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagingKeys.conversations }),
  })
}
