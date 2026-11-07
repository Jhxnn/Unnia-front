import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventView, PostView } from '../lib/api/types'

function feedResult(posts: PostView[], extra: Record<string, unknown> = {}) {
  return {
    isPending: false,
    isError: false,
    error: null as unknown,
    data: { pages: [posts] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...extra,
  }
}

const state = vi.hoisted(() => ({
  role: 'VOLUNTEER' as 'VOLUNTEER' | 'NGO',
  feed: null as ReturnType<typeof feedResult> | null,
  myEvents: { data: [] as EventView[] },
  publish: vi.fn(),
  eventsEnabled: undefined as boolean | undefined,
}))

vi.mock('../features/auth/useSession', () => ({
  useSession: () => ({ status: 'authenticated', session: { accountId: 'acc-1', role: state.role } }),
}))
vi.mock('../features/events/queries', () => ({
  useMyEvents: (enabled: boolean) => {
    state.eventsEnabled = enabled
    return state.myEvents
  },
}))
vi.mock('../features/social/queries', () => ({
  useFeed: () => state.feed,
  usePublishPost: () => ({ mutate: state.publish, isPending: false }),
}))
vi.mock('../features/social/PostItem', () => ({
  PostItem: ({ post }: { post: PostView }) => <article>{post.text}</article>,
}))

import { FeedPage } from './FeedPage'

function post(id: string, text: string): PostView {
  return {
    postId: id,
    authorId: 'acc-n',
    author: { name: 'Rede', role: 'NGO', profileId: 'ngo-1' },
    text,
    media: [],
    linkedEventId: null,
    createdAt: new Date().toISOString(),
    editedAt: null,
    reactionCount: 0,
    commentCount: 0,
    myReaction: null,
  }
}

function event(id: string, title: string, status: EventView['status']): EventView {
  return {
    eventId: id,
    ownerId: 'ngo-1',
    title,
    description: '',
    address: 'Rua A',
    city: 'Recife',
    start: new Date().toISOString(),
    end: new Date().toISOString(),
    capacity: 10,
    occupiedSpots: 0,
    availableSpots: 10,
    status,
  }
}

function setup() {
  render(
    <MemoryRouter>
      <FeedPage />
    </MemoryRouter>,
  )
}

describe('FeedPage', () => {
  beforeEach(() => {
    state.role = 'VOLUNTEER'
    state.feed = feedResult([post('p-1', 'Primeira publicação'), post('p-2', 'Segunda publicação')])
    state.myEvents = { data: [] }
    state.publish.mockReset()
  })

  it('lista as publicações do feed', () => {
    setup()

    expect(screen.getByText('Primeira publicação')).toBeInTheDocument()
    expect(screen.getByText('Segunda publicação')).toBeInTheDocument()
  })

  it('feed vazio sugere conhecer ONGs', () => {
    state.feed = feedResult([])
    setup()

    expect(screen.getByText('Seu feed está vazio')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conhecer ONGs' })).toHaveAttribute('href', '/ongs')
  })

  it('erro ao carregar oferece tentar de novo', async () => {
    const refetch = vi.fn()
    state.feed = feedResult([], { isError: true, error: new Error('falhou'), refetch })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(refetch).toHaveBeenCalled()
  })

  it('publicar envia o texto escrito', async () => {
    setup()

    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Olá, pessoal')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(state.publish).toHaveBeenCalledWith({ text: 'Olá, pessoal', linkedEventId: undefined })
  })

  it('voluntários não consultam eventos para divulgar', () => {
    setup()

    expect(state.eventsEnabled).toBe(false)
    expect(screen.queryByLabelText('Divulgar um evento')).not.toBeInTheDocument()
  })

  it('ONGs só podem divulgar eventos já publicados', () => {
    state.role = 'NGO'
    state.myEvents = {
      data: [event('e-1', 'Mutirão publicado', 'PUBLISHED'), event('e-2', 'Rascunho', 'DRAFT'), event('e-3', 'Cancelado', 'CANCELLED')],
    }
    setup()

    expect(state.eventsEnabled).toBe(true)
    expect(screen.getByRole('option', { name: 'Mutirão publicado' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Rascunho' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Cancelado' })).not.toBeInTheDocument()
  })

  it('com mais páginas, oferece carregar mais', async () => {
    const fetchNextPage = vi.fn()
    state.feed = feedResult([post('p-1', 'Uma')], { hasNextPage: true, fetchNextPage })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(fetchNextPage).toHaveBeenCalled()
  })
})
