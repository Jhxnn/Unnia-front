import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { PostView } from '../../lib/api/types'
import { PostCard } from './PostCard'

const now = new Date(2026, 10, 7, 12, 0, 0)

function post(overrides: Partial<PostView> = {}): PostView {
  return {
    postId: 'post-1',
    authorId: 'acc-n',
    author: { name: 'Rede Mãos Solidárias', role: 'NGO', profileId: 'ngo-1' },
    text: 'Mutirão sábado no Coque.',
    media: [],
    linkedEventId: null,
    createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString(),
    editedAt: null,
    reactionCount: 3,
    commentCount: 1,
    myReaction: null,
    ...overrides,
  }
}

function setup(props: Partial<ComponentProps<typeof PostCard>> = {}) {
  const handlers = { onReact: vi.fn(), onDelete: vi.fn(), onToggleComments: vi.fn() }
  render(
    <MemoryRouter>
      <PostCard post={post()} now={now} canDelete={false} commentsOpen={false} {...handlers} {...props} />
    </MemoryRouter>,
  )
  return handlers
}

describe('PostCard', () => {
  it('mostra autor com link para o perfil, papel, tempo e texto', () => {
    setup()

    expect(screen.getByRole('link', { name: 'Rede Mãos Solidárias' })).toHaveAttribute('href', '/ongs/ngo-1')
    expect(screen.getByText('ONG')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'há 3 h' })).toHaveAttribute('href', '/posts/post-1')
    expect(screen.getByText('Mutirão sábado no Coque.')).toBeInTheDocument()
  })

  it('voluntários levam ao perfil de voluntário', () => {
    setup({ post: post({ author: { name: 'Maria', role: 'VOLUNTEER', profileId: 'vol-1' } }) })
    expect(screen.getByRole('link', { name: 'Maria' })).toHaveAttribute('href', '/voluntarios/vol-1')
  })

  it('conta removida aparece sem link', () => {
    setup({ post: post({ author: { name: 'Conta removida', role: 'UNKNOWN', profileId: null } }) })
    expect(screen.getByText('Conta removida')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Conta removida' })).not.toBeInTheDocument()
  })

  it('posts editados são sinalizados', () => {
    setup({ post: post({ editedAt: new Date(now.getTime() - 60_000).toISOString() }) })
    expect(screen.getByRole('link', { name: 'há 3 h · editado' })).toBeInTheDocument()
  })

  it('divulgar um evento mostra o atalho para ele', () => {
    setup({ post: post({ linkedEventId: 'event-9' }) })
    expect(screen.getByRole('link', { name: 'Ver o evento' })).toHaveAttribute('href', '/eventos/event-9')
  })

  it('a reação escolhida fica marcada e clicar nela de novo remove', async () => {
    const { onReact } = setup({ post: post({ myReaction: 'LOVE' }) })

    expect(screen.getByRole('button', { name: 'Adorei' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Curtir' })).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Adorei' }))
    expect(onReact).toHaveBeenLastCalledWith(null)

    await userEvent.click(screen.getByRole('button', { name: 'Apoio' }))
    expect(onReact).toHaveBeenLastCalledWith('SUPPORT')
  })

  it('mostra as contagens no singular e no plural', () => {
    setup({ post: post({ reactionCount: 1, commentCount: 2 }) })

    expect(screen.getByText('1 reação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 comentários' })).toBeInTheDocument()
  })

  it('excluir só existe para o dono', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('o dono exclui em duas etapas', async () => {
    const { onDelete } = setup({ canDelete: true })

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('os comentários só aparecem quando abertos', async () => {
    const { onToggleComments } = setup({ children: <p>Conteúdo dos comentários</p> })
    expect(screen.queryByText('Conteúdo dos comentários')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '1 comentário' }))
    expect(onToggleComments).toHaveBeenCalledOnce()
  })

  it('aberto, mostra os comentários e informa o estado ao leitor de tela', () => {
    setup({ commentsOpen: true, children: <p>Conteúdo dos comentários</p> })

    expect(screen.getByText('Conteúdo dos comentários')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 comentário' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('bloqueia as reações enquanto uma reação está sendo enviada', () => {
    setup({ reacting: true })
    expect(screen.getByRole('button', { name: 'Curtir' })).toBeDisabled()
  })
  it('editar só aparece quando quem chama permite', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('o dono edita o texto no próprio cartão e salva o texto aparado', async () => {
    const onEdit = vi.fn()
    setup({ onEdit })

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const field = screen.getByRole('textbox', { name: 'Texto da postagem' })
    expect(field).toHaveValue('Mutirão sábado no Coque.')
    await userEvent.clear(field)
    await userEvent.type(field, '  Mutirão adiado para domingo.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onEdit).toHaveBeenCalledWith('Mutirão adiado para domingo.')
    expect(screen.queryByRole('textbox', { name: 'Texto da postagem' })).not.toBeInTheDocument()
  })

  it('cancelar a edição descarta o rascunho sem enviar', async () => {
    const onEdit = vi.fn()
    setup({ onEdit })

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Texto da postagem' }), ' extra')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByText('Mutirão sábado no Coque.')).toBeInTheDocument()
  })

  it('salvar sem mudar nada não envia nada', async () => {
    const onEdit = vi.fn()
    setup({ onEdit })

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onEdit).not.toHaveBeenCalled()
  })

  it('não dá para salvar uma postagem vazia', async () => {
    setup({ onEdit: vi.fn() })

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.clear(screen.getByRole('textbox', { name: 'Texto da postagem' }))

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })
  it('mostra as imagens da postagem, abrindo a original em outra aba', () => {
    setup({
      post: post({
        media: [
          { url: 'https://cdn/a.png', type: 'IMAGE' },
          { url: 'https://cdn/b.png', type: 'IMAGE' },
        ],
      }),
    })

    const images = screen.getAllByAltText('Imagem da postagem')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'https://cdn/a.png')
    expect(images[0]).toHaveAttribute('loading', 'lazy')
    const link = images[0]?.closest('a')
    expect(link).toHaveAttribute('href', 'https://cdn/a.png')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sem imagens, não desenha a grade', () => {
    setup()

    expect(screen.queryByRole('list', { name: 'Imagens da postagem' })).not.toBeInTheDocument()
  })

  it('só desenha mídia do tipo imagem', () => {
    setup({
      post: post({
        media: [
          { url: 'https://cdn/a.png', type: 'IMAGE' },
          { url: 'https://cdn/v.mp4', type: 'VIDEO' },
        ],
      }),
    })

    expect(screen.getAllByAltText('Imagem da postagem')).toHaveLength(1)
  })
})
