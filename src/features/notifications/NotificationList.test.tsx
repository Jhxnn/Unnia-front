import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { NotificationView } from '../../lib/api/types'
import { NotificationList } from './NotificationList'

const now = new Date(2026, 10, 7, 12, 0, 0)

function notification(overrides: Partial<NotificationView> = {}): NotificationView {
  return {
    notificationId: 'n-1',
    type: 'NEW_COMMENT',
    text: 'Alguém comentou na sua postagem',
    referenceId: 'post-1',
    createdAt: new Date(now.getTime() - 5 * 60_000).toISOString(),
    read: false,
    ...overrides,
  }
}

function setup(items: NotificationView[]) {
  const onOpen = vi.fn()
  render(
    <MemoryRouter>
      <NotificationList notifications={items} now={now} onOpen={onOpen} />
    </MemoryRouter>,
  )
  return onOpen
}

describe('NotificationList', () => {
  it('mostra o texto e há quanto tempo, e marca as não lidas para leitores de tela', () => {
    setup([notification()])

    expect(screen.getByText('Alguém comentou na sua postagem')).toBeInTheDocument()
    expect(screen.getByText('há 5 min')).toBeInTheDocument()
    expect(screen.getByText('Não lida')).toBeInTheDocument()
  })

  it('abrir uma não lida avisa quem chamou, e ela leva ao destino', async () => {
    const onOpen = setup([notification()])

    const link = screen.getByRole('link', { name: /Alguém comentou/ })
    expect(link).toHaveAttribute('href', '/posts/post-1')
    await userEvent.click(link)

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ notificationId: 'n-1' }))
  })

  it('abrir uma já lida não pede para marcar de novo', async () => {
    const onOpen = setup([notification({ read: true })])

    await userEvent.click(screen.getByRole('link', { name: /Alguém comentou/ }))

    expect(onOpen).not.toHaveBeenCalled()
    expect(screen.queryByText('Não lida')).not.toBeInTheDocument()
  })

  it('uma notificação sem destino vira botão que só marca como lida', async () => {
    const onOpen = setup([notification({ type: 'NEW_FOLLOWER', text: 'Você tem um novo seguidor', referenceId: 'acc-1' })])

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /novo seguidor/ }))

    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('um botão de notificação já lida fica desabilitado', () => {
    setup([notification({ type: 'NEW_FOLLOWER', referenceId: 'acc-1', read: true })])

    expect(screen.getByRole('button')).toBeDisabled()
  })
})
