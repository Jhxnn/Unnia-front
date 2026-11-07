import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/useToast'
import { followsApi, postsApi } from '../../lib/api/endpoints'
import { describeError } from '../../lib/api/errors'
import type { PublishPostInput, ReactionType } from '../../lib/api/types'

export const FEED_PAGE_SIZE = 20

export const socialKeys = {
  posts: ['posts'] as const,
  feed: ['posts', 'feed'] as const,
  post: (postId: string) => ['posts', 'detail', postId] as const,
  author: (accountId: string) => ['posts', 'author', accountId] as const,
  comments: (postId: string) => ['posts', 'comments', postId] as const,
  follow: (accountId: string) => ['follow', accountId] as const,
}

/** Feed pessoal, paginado ("Carregar mais"). */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: socialKeys.feed,
    queryFn: ({ pageParam, signal }) => postsApi.feed(pageParam, FEED_PAGE_SIZE, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === FEED_PAGE_SIZE ? allPages.length : undefined),
  })
}

export function usePost(postId: string) {
  return useQuery({ queryKey: socialKeys.post(postId), queryFn: () => postsApi.get(postId) })
}

export function useAuthorPosts(accountId: string | undefined) {
  return useQuery({
    queryKey: socialKeys.author(accountId ?? ''),
    queryFn: () => postsApi.byAuthor(accountId as string),
    enabled: Boolean(accountId),
  })
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({ queryKey: socialKeys.comments(postId), queryFn: () => postsApi.comments(postId), enabled })
}

/** Mutação do módulo social: avisa só quando há mensagem, mostra o erro da API e atualiza as listas. */
function useSocialMutation<TInput>(
  action: (input: TInput) => Promise<unknown>,
  successMessage?: string,
  onDone?: () => void,
) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      if (successMessage) toast.success(successMessage)
      await queryClient.invalidateQueries({ queryKey: socialKeys.posts })
      onDone?.()
    },
    onError: (error) => toast.error(describeError(error)),
  })
}

export function usePublishPost(onDone?: () => void) {
  return useSocialMutation((input: PublishPostInput) => postsApi.publish(input), 'Publicado.', onDone)
}

export function useDeletePost() {
  return useSocialMutation((postId: string) => postsApi.remove(postId), 'Postagem excluída.')
}

/** `type` nulo remove a reação. */
export function useReact() {
  return useSocialMutation(({ postId, type }: { postId: string; type: ReactionType | null }) =>
    type ? postsApi.react(postId, type) : postsApi.unreact(postId),
  )
}

export function useAddComment(postId: string, onDone?: () => void) {
  return useSocialMutation((text: string) => postsApi.comment(postId, text), undefined, onDone)
}

export function useReply(onDone?: () => void) {
  return useSocialMutation(
    ({ commentId, text }: { commentId: string; text: string }) => postsApi.reply(commentId, text),
    undefined,
    onDone,
  )
}

export function useDeleteComment() {
  return useSocialMutation((commentId: string) => postsApi.removeComment(commentId), 'Comentário excluído.')
}

export function useFollowStatus(accountId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: socialKeys.follow(accountId ?? ''),
    queryFn: () => followsApi.status(accountId as string),
    enabled: enabled && Boolean(accountId),
  })
}

export function useToggleFollow(accountId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (follow: boolean) => (follow ? followsApi.follow(accountId) : followsApi.unfollow(accountId)),
    onSuccess: async (_data, follow) => {
      toast.success(follow ? 'Agora você segue.' : 'Você deixou de seguir.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: socialKeys.follow(accountId) }),
        queryClient.invalidateQueries({ queryKey: socialKeys.feed }),
      ])
    },
    onError: (error) => toast.error(describeError(error)),
  })
}
