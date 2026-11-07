import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationView } from '../lib/api/types'

const state = vi.hoisted(() => ({
  list: { isPending: false, isError: false, error: null as unknown, data: [] as NotificationView[], refetch: vi.fn() },
  markRead: vi.fn(),
  markAll: vi.fn(),
}))

vi.mock('../features/notifications/queries', () => ({
  useNotifications: () => state.list,
  useMarkNotificationRead: () => ({ mutate: state.markRead }),
  useMarkAllNotificationsRead: () => ({ mutate: state.markAll, isPending: false }),
}))

import { NotificationsPage } from './NotificationsPage'

function notification(id: string, read: boolean): NotificationView {
  return {
    notificationId: id,
    type: 'NEW_FOLLOWER',
    text: `Notificação ${id}`,
    referenceId: 'acc-1',
    createdAt: new Date().toISOString(),
    read,
  }
}

function setup() {
  render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  )
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    state.list = { isPending: false, isError: false, error: null, data: [], refetch: vi.fn() }
    state.markRead.mockReset()
    state.markAll.mockReset()
  })

  it('sem notificações, explica o que aparece aqui', () => {
    setup()
    expect(screen.getByText('Nada por aqui ainda')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar todas como lidas' })).not.toBeInTheDocument()
  })

  it('"Marcar todas como lidas" só existe quando há alguma não lida', async () => {
    state.list.data = [notification('a', true), notification('b', false)]
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }))

    expect(state.markAll).toHaveBeenCalled()
  })

  it('com tudo lido, o botão some', () => {
    state.list.data = [notification('a', true)]
    setup()

    expect(screen.queryByRole('button', { name: 'Marcar todas como lidas' })).not.toBeInTheDocument()
  })

  it('abrir uma notificação não lida marca só ela', async () => {
    state.list.data = [notification('a', false)]
    setup()

    await userEvent.click(screen.getByRole('button', { name: /Notificação a/ }))

    expect(state.markRead).toHaveBeenCalledWith('a')
  })

  it('erro ao carregar oferece tentar de novo', async () => {
    state.list = { isPending: false, isError: true, error: new Error('falhou'), data: [], refetch: vi.fn() }
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(state.list.refetch).toHaveBeenCalled()
  })
})
