import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversationView, MessageView } from '../lib/api/types'

const state = vi.hoisted(() => ({
  conversations: { isPending: false, isError: false, error: null as unknown, data: [] as ConversationView[] },
  thread: { isPending: false, isError: false, error: null as unknown, data: [] as MessageView[] },
  send: vi.fn(),
  markRead: vi.fn(),
}))

vi.mock('../features/auth/useSession', () => ({
  useSession: () => ({ status: 'authenticated', session: { accountId: 'acc-me', role: 'NGO' } }),
}))
vi.mock('../features/messaging/queries', () => ({
  useConversations: () => state.conversations,
  useThread: (conversationId: string | undefined) => (conversationId ? state.thread : { isPending: false, data: undefined }),
  useMarkConversationRead: () => ({ mutate: state.markRead }),
  useSendMessage: () => ({ mutate: state.send, isPending: false }),
}))

import { MessagesPage } from './MessagesPage'

function conversation(overrides: Partial<ConversationView> = {}): ConversationView {
  return {
    conversationId: 'conv-1',
    otherAccountId: 'acc-maria',
    otherName: 'Maria Souza',
    lastActivityAt: new Date().toISOString(),
    unreadCount: 0,
    ...overrides,
  }
}

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname}</output>
}

function setup(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Where />
      <Routes>
        <Route path="/mensagens" element={<MessagesPage />} />
        <Route path="/mensagens/:conversationId" element={<MessagesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MessagesPage', () => {
  beforeEach(() => {
    state.conversations = { isPending: false, isError: false, error: null, data: [] }
    state.thread = { isPending: false, isError: false, error: null, data: [] }
    state.send.mockReset()
    state.markRead.mockReset()
  })

  it('sem conversas, explica como começar uma', () => {
    setup('/mensagens')

    expect(screen.getByText(/Você ainda não tem conversas/)).toBeInTheDocument()
    expect(screen.getByText('Escolha uma conversa para ler e responder.')).toBeInTheDocument()
  })

  it('lista as conversas com o nome do outro lado', () => {
    state.conversations.data = [conversation()]
    setup('/mensagens')

    expect(screen.getByRole('link', { name: /Maria Souza/ })).toHaveAttribute('href', '/mensagens/conv-1')
  })

  it('abrir uma conversa mostra as mensagens do mais antigo para o mais novo', () => {
    state.conversations.data = [conversation()]
    state.thread.data = [
      { messageId: 'm-2', senderId: 'acc-me', text: 'Segunda', sentAt: new Date().toISOString(), readAt: null },
      { messageId: 'm-1', senderId: 'acc-maria', text: 'Primeira', sentAt: new Date().toISOString(), readAt: null },
    ]
    setup('/mensagens/conv-1')

    const texts = screen.getAllByRole('listitem').map((item) => item.textContent ?? '')
    const first = texts.findIndex((text) => text.includes('Primeira'))
    const second = texts.findIndex((text) => text.includes('Segunda'))
    expect(first).toBeGreaterThan(-1)
    expect(first).toBeLessThan(second)
  })

  it('abrir uma conversa com não lidas marca como lida', () => {
    state.conversations.data = [conversation({ unreadCount: 2 })]
    setup('/mensagens/conv-1')

    expect(state.markRead).toHaveBeenCalled()
  })

  it('uma conversa sem não lidas não é marcada de novo', () => {
    state.conversations.data = [conversation({ unreadCount: 0 })]
    setup('/mensagens/conv-1')

    expect(state.markRead).not.toHaveBeenCalled()
  })

  it('responder envia para a outra pessoa da conversa', async () => {
    state.conversations.data = [conversation()]
    setup('/mensagens/conv-1')

    await userEvent.type(screen.getByRole('textbox', { name: 'Escreva uma mensagem' }), 'Combinado!')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(state.send).toHaveBeenCalledWith({ recipientId: 'acc-maria', text: 'Combinado!' })
  })

  it('"Enviar mensagem" de um perfil sem conversa abre uma conversa nova com o nome da pessoa', async () => {
    setup('/mensagens?para=acc-novo&nome=Rede%20M%C3%A3os')

    expect(screen.getByRole('heading', { name: 'Nova conversa com Rede Mãos' })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Escreva uma mensagem' }), 'Olá!')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(state.send).toHaveBeenCalledWith({ recipientId: 'acc-novo', text: 'Olá!' })
  })

  it('"Enviar mensagem" para quem já tem conversa abre a que existe', () => {
    state.conversations.data = [conversation()]
    setup('/mensagens?para=acc-maria&nome=Maria')

    expect(screen.getByTestId('where')).toHaveTextContent('/mensagens/conv-1')
  })

  it('enquanto as conversas carregam, não abre a conversa nova por engano', () => {
    state.conversations = { isPending: true, isError: false, error: null, data: [] as ConversationView[] }
    setup('/mensagens?para=acc-novo&nome=Alguém')

    expect(screen.queryByRole('heading', { name: /Nova conversa/ })).not.toBeInTheDocument()
  })
})
