import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_IMAGE_BYTES } from './images'
import { PostComposer } from './PostComposer'

const png = (name = 'foto.png', size = 1024) => new File([new Uint8Array(size)], name, { type: 'image/png' })

function setup(onUpload?: (file: File) => Promise<string>, onSubmit = vi.fn()) {
  render(<PostComposer busy={false} events={[]} onSubmit={onSubmit} onUpload={onUpload} />)
  return { onSubmit, input: () => screen.getByLabelText('Escolher imagens') as HTMLInputElement }
}

describe('PostComposer: imagens', () => {
  it('sem função de envio, não oferece imagens', () => {
    setup(undefined)

    expect(screen.queryByRole('button', { name: 'Adicionar imagem' })).not.toBeInTheDocument()
  })

  it('o botão "Adicionar imagem" abre o seletor de arquivos', async () => {
    const { input } = setup(vi.fn())
    const click = vi.spyOn(input(), 'click')

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar imagem' }))

    expect(click).toHaveBeenCalled()
  })

  it('o seletor só oferece formatos de imagem aceitos', () => {
    const { input } = setup(vi.fn())

    expect(input().accept).toBe('image/jpeg,image/png,image/webp,image/gif')
  })

  it('envia a imagem escolhida e mostra a miniatura', async () => {
    const onUpload = vi.fn().mockResolvedValue('https://cdn/posts/a.png')
    const { input } = setup(onUpload)

    await userEvent.upload(input(), png('foto.png'))

    expect(await screen.findByAltText('foto.png')).toHaveAttribute('src', 'https://cdn/posts/a.png')
    expect(onUpload).toHaveBeenCalledTimes(1)
    expect((onUpload.mock.calls[0]?.[0] as File).name).toBe('foto.png')
  })

  it('enquanto envia, mostra o andamento e bloqueia publicar', async () => {
    let finish: (url: string) => void = () => undefined
    const { input } = setup(() => new Promise<string>((resolve) => (finish = resolve)))
    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Olhem!')

    await userEvent.upload(input(), png())

    expect(await screen.findByText('Enviando…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled()
    finish('https://cdn/posts/a.png')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled())
  })

  it('publicar leva as imagens junto, como mídia do tipo IMAGE', async () => {
    const onUpload = vi.fn().mockResolvedValueOnce('https://cdn/a.png').mockResolvedValueOnce('https://cdn/b.png')
    const { input, onSubmit } = setup(onUpload)
    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Mutirão de ontem')

    await userEvent.upload(input(), [png('a.png'), png('b.png')])
    await screen.findByAltText('b.png')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(onSubmit).toHaveBeenCalledWith({
      text: 'Mutirão de ontem',
      linkedEventId: undefined,
      media: [
        { url: 'https://cdn/a.png', type: 'IMAGE' },
        { url: 'https://cdn/b.png', type: 'IMAGE' },
      ],
    })
  })

  it('depois de publicar, as miniaturas somem', async () => {
    const { input } = setup(vi.fn().mockResolvedValue('https://cdn/a.png'))
    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Oi')
    await userEvent.upload(input(), png('a.png'))
    await screen.findByAltText('a.png')

    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(screen.queryByAltText('a.png')).not.toBeInTheDocument()
  })

  it('dá para remover uma imagem antes de publicar', async () => {
    const { input, onSubmit } = setup(vi.fn().mockResolvedValue('https://cdn/a.png'))
    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Oi')
    await userEvent.upload(input(), png('a.png'))
    await screen.findByAltText('a.png')

    await userEvent.click(screen.getByRole('button', { name: 'Remover imagem a.png' }))
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(screen.queryByAltText('a.png')).not.toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledWith({ text: 'Oi', linkedEventId: undefined, media: undefined })
  })

  it('recusa o que não é imagem aceita, sem tentar enviar', async () => {
    const onUpload = vi.fn()
    const { input } = setup(onUpload)

    await userEvent.upload(input(), new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }), { applyAccept: false })

    expect(await screen.findByRole('alert')).toHaveTextContent('logo.svg: Use uma imagem JPEG, PNG, WebP ou GIF.')
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('recusa imagem acima de 5 MB, sem tentar enviar', async () => {
    const onUpload = vi.fn()
    const { input } = setup(onUpload)

    await userEvent.upload(input(), png('grande.png', MAX_IMAGE_BYTES + 1))

    expect(await screen.findByRole('alert')).toHaveTextContent('grande.png: A imagem passa de 5 MB.')
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('aceita no máximo 4 imagens: a quinta é descartada com aviso e o botão trava', async () => {
    const onUpload = vi.fn().mockImplementation(async (file: File) => `https://cdn/${file.name}`)
    const { input } = setup(onUpload)

    await userEvent.upload(input(), [1, 2, 3, 4, 5].map((n) => png(`f${n}.png`)))

    expect(await screen.findByAltText('f4.png')).toBeInTheDocument()
    expect(onUpload).toHaveBeenCalledTimes(4)
    expect(screen.queryByAltText('f5.png')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Cada postagem aceita até 4 imagens.')
    expect(screen.getByRole('button', { name: 'Adicionar imagem' })).toBeDisabled()
  })

  it('se o envio falha, nada é anexado e dá para publicar só o texto', async () => {
    const { input } = setup(vi.fn().mockRejectedValue(new Error('falhou')))
    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Só texto')

    await userEvent.upload(input(), png())

    await waitFor(() => expect(screen.queryByText('Enviando…')).not.toBeInTheDocument())
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })
})
