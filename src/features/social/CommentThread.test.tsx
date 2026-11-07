import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommentView } from '../../lib/api/types'
import { CommentThread } from './CommentThread'

const now = new Date(2026, 10, 7, 12, 0, 0)

function comment(overrides: Partial<CommentView> = {}): CommentView {
  return {
    commentId: 'c-1',
    authorId: 'acc-v',
    author: { name: 'Maria Souza', role: 'VOLUNTEER', profileId: 'vol-1' },
    text: 'Posso levar amigas?',
    createdAt: new Date(now.getTime() - 10 * 60_000).toISOString(),
    replies: [],
    ...overrides,
  }
}

function setup(comments: CommentView[], viewerAccountId: string | null = 'acc-x') {
  const handlers = { onAdd: vi.fn(), onReply: vi.fn(), onDelete: vi.fn() }
  render(
    <MemoryRouter>
      <CommentThread
        comments={comments}
        now={now}
        viewerAccountId={viewerAccountId}
        busy={false}
        renderReport={(item) => <button type="button">Denunciar {item.commentId}</button>}
        {...handlers}
      />
    </MemoryRouter>,
  )
  return handlers
}

describe('CommentThread', () => {
  it('sem comentários, convida a escrever o primeiro', () => {
    setup([])
    expect(screen.getByText('Ninguém comentou ainda. Seja a primeira pessoa.')).toBeInTheDocument()
  })

  it('mostra autor, tempo e texto, com as respostas aninhadas', () => {
    setup([
      comment({
        replies: [
          comment({
            commentId: 'c-2',
            authorId: 'acc-n',
            author: { name: 'Rede Mãos', role: 'NGO', profileId: 'ngo-1' },
            text: 'Pode sim!',
          }),
        ],
      }),
    ])

    expect(screen.getByText('Posso levar amigas?')).toBeInTheDocument()
    // o comentário e a resposta foram feitos no mesmo horário
    expect(screen.getAllByText('há 10 min')).toHaveLength(2)
    const reply = screen.getByText('Pode sim!').closest('li') as HTMLElement
    expect(within(reply).getByText('Rede Mãos')).toBeInTheDocument()
  })

  it('adiciona um comentário sem espaços sobrando e limpa o campo', async () => {
    const { onAdd } = setup([])

    const input = screen.getByRole('textbox', { name: 'Escreva um comentário' })
    await userEvent.type(input, '  Boa iniciativa!  ')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(onAdd).toHaveBeenCalledWith('Boa iniciativa!')
    expect(input).toHaveValue('')
  })

  it('não envia comentário vazio', () => {
    setup([])
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('responder abre um campo para aquele comentário e envia com o id dele', async () => {
    const { onReply } = setup([comment()])

    await userEvent.click(screen.getByRole('button', { name: 'Responder' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Responder a Maria Souza' }), 'Claro!')
    const form = screen.getByRole('textbox', { name: 'Responder a Maria Souza' }).closest('form') as HTMLElement
    await userEvent.click(within(form).getByRole('button', { name: 'Enviar' }))

    expect(onReply).toHaveBeenCalledWith('c-1', 'Claro!')
    expect(screen.queryByRole('textbox', { name: 'Responder a Maria Souza' })).not.toBeInTheDocument()
  })

  it('cancelar a resposta fecha o campo sem enviar', async () => {
    const { onReply } = setup([comment()])

    await userEvent.click(screen.getByRole('button', { name: 'Responder' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('textbox', { name: 'Responder a Maria Souza' })).not.toBeInTheDocument()
    expect(onReply).not.toHaveBeenCalled()
  })

  it('respostas não têm "Responder": a conversa tem um nível só', () => {
    setup([comment({ replies: [comment({ commentId: 'c-2', text: 'Resposta' })] })])
    expect(screen.getAllByRole('button', { name: 'Responder' })).toHaveLength(1)
  })

  it('o autor exclui o próprio comentário em duas etapas e não vê denunciar', async () => {
    const { onDelete } = setup([comment()], 'acc-v')

    expect(screen.queryByRole('button', { name: 'Denunciar c-1' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    expect(onDelete).toHaveBeenCalledWith('c-1')
  })

  it('outras pessoas veem denunciar, não excluir', () => {
    setup([comment()], 'acc-x')

    expect(screen.getByRole('button', { name: 'Denunciar c-1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })
})
