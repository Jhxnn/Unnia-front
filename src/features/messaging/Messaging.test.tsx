import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ConversationView, MessageView } from '../../lib/api/types'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'

const now = new Date(2026, 10, 7, 12, 0, 0)

function conversation(overrides: Partial<ConversationView> = {}): ConversationView {
  return {
    conversationId: 'conv-1',
    otherAccountId: 'acc-m',
    otherName: 'Maria Souza',
    lastActivityAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
    unreadCount: 0,
    ...overrides,
  }
}

function message(overrides: Partial<MessageView> = {}): MessageView {
  return {
    messageId: 'm-1',
    senderId: 'acc-m',
    text: 'Oi!',
    sentAt: new Date(2026, 10, 7, 9, 30).toISOString(),
    readAt: null,
    ...overrides,
  }
}

describe('ConversationList', () => {
  it('mostra com quem é cada conversa, quando houve atividade e leva a ela', () => {
    render(
      <MemoryRouter>
        <ConversationList conversations={[conversation()]} activeId={undefined} now={now} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /Maria Souza/ })
    expect(link).toHaveAttribute('href', '/mensagens/conv-1')
    expect(screen.getByText('há 2 h')).toBeInTheDocument()
  })

  it('mostra o selo de não lidas só quando há', () => {
    render(
      <MemoryRouter>
        <ConversationList
          conversations={[
            conversation({ unreadCount: 3 }),
            conversation({ conversationId: 'conv-2', otherName: 'João', unreadCount: 0 }),
          ]}
          activeId={undefined}
          now={now}
        />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('3 não lidas')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/não lidas/)).toHaveLength(1)
  })

  it('a conversa aberta fica marcada como página atual', () => {
    render(
      <MemoryRouter>
        <ConversationList conversations={[conversation()]} activeId="conv-1" now={now} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Maria Souza/ })).toHaveAttribute('aria-current', 'page')
  })
})

describe('MessageThread', () => {
  it('diferencia minhas mensagens das do outro lado', () => {
    render(
      <MessageThread
        messages={[message(), message({ messageId: 'm-2', senderId: 'acc-me', text: 'Olá, Maria' })]}
        viewerAccountId="acc-me"
        busy={false}
        onSend={vi.fn()}
      />,
    )

    expect(screen.getByText('Oi!').closest('li')).not.toHaveClass('bubble--mine')
    expect(screen.getByText('Olá, Maria').closest('li')).toHaveClass('bubble--mine')
  })

  it('sem mensagens, convida a escrever a primeira', () => {
    render(<MessageThread messages={[]} viewerAccountId="acc-me" busy={false} onSend={vi.fn()} />)
    expect(screen.getByText('Escreva a primeira mensagem.')).toBeInTheDocument()
  })

  it('envia o texto aparado e limpa o campo', async () => {
    const onSend = vi.fn()
    render(<MessageThread messages={[]} viewerAccountId="acc-me" busy={false} onSend={onSend} />)

    const input = screen.getByRole('textbox', { name: 'Escreva uma mensagem' })
    await userEvent.type(input, '  Bom dia  ')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(onSend).toHaveBeenCalledWith('Bom dia')
    expect(input).toHaveValue('')
  })

  it('não envia mensagem vazia', async () => {
    const onSend = vi.fn()
    render(<MessageThread messages={[]} viewerAccountId="acc-me" busy={false} onSend={onSend} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Escreva uma mensagem' }), '   ')

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })
})
