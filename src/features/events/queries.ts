import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/useToast'
import { eventsApi, ngosApi } from '../../lib/api/endpoints'
import { describeError } from '../../lib/api/errors'
import { useSession } from '../auth/useSession'

export const eventKeys = {
  all: ['events'] as const,
  upcoming: ['events', 'upcoming'] as const,
  detail: (eventId: string) => ['events', 'detail', eventId] as const,
  mine: ['events', 'mine'] as const,
  registered: ['events', 'registered'] as const,
  registrants: (eventId: string) => ['events', 'registrants', eventId] as const,
}

export const UPCOMING_PAGE_SIZE = 12

/** Próximos eventos publicados, paginados ("Carregar mais"). */
export function useUpcomingEvents() {
  return useInfiniteQuery({
    queryKey: eventKeys.upcoming,
    queryFn: ({ pageParam, signal }) => eventsApi.upcoming(pageParam, UPCOMING_PAGE_SIZE, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === UPCOMING_PAGE_SIZE ? allPages.length : undefined),
  })
}

export function useEvent(eventId: string) {
  const { session } = useSession()
  return useQuery({
    // a visibilidade de rascunhos depende de quem pergunta, então o usuário entra na chave
    queryKey: [...eventKeys.detail(eventId), session?.accountId ?? 'guest'],
    queryFn: () => eventsApi.get(eventId),
  })
}

export function useOrganizer(ngoId: string | undefined) {
  return useQuery({
    queryKey: ['ngo', ngoId],
    queryFn: () => ngosApi.get(ngoId as string),
    enabled: Boolean(ngoId),
    staleTime: 5 * 60_000,
  })
}

export function useMyEvents(enabled: boolean) {
  return useQuery({ queryKey: eventKeys.mine, queryFn: eventsApi.mine, enabled })
}

/** Eventos em que o voluntário logado está inscrito. */
export function useMyRegistrations(enabled: boolean) {
  return useQuery({ queryKey: eventKeys.registered, queryFn: eventsApi.registered, enabled })
}

/** Inscritos no evento. Só faz sentido (e só funciona) para a ONG dona. */
export function useRegistrants(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: eventKeys.registrants(eventId),
    queryFn: () => eventsApi.registrants(eventId),
    enabled,
  })
}

/** Registra a presença de um voluntário e atualiza a lista de inscritos. */
export function useRecordAttendance(eventId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (volunteerId: string) => eventsApi.recordAttendance(eventId, volunteerId),
    onSuccess: () => {
      toast.success('Presença registrada.')
      return queryClient.invalidateQueries({ queryKey: eventKeys.registrants(eventId) })
    },
    onError: (error) => toast.error(describeError(error)),
  })
}

/** Ação sobre um evento (publicar, inscrever-se...) que avisa o resultado e atualiza as listas. */
export function useEventAction(action: (eventId: string) => Promise<void>, successMessage: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      toast.success(successMessage)
      return queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
    onError: (error) => toast.error(describeError(error)),
  })
}
