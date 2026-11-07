import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EventView } from '../../lib/api/types'
import { PostComposer } from './PostComposer'

function event(id: string, title: string): EventView {
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
    status: 'PUBLISHED',
  }
}

describe('PostComposer', () => {
  it('só habilita publicar quando há texto', async () => {
    render(<PostComposer busy={false} events={[]} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Olá')
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })

  it('publica o texto aparado e limpa o campo', async () => {
    const onSubmit = vi.fn()
    render(<PostComposer busy={false} events={[]} onSubmit={onSubmit} />)

    const field = screen.getByLabelText('O que você quer compartilhar?')
    await userEvent.type(field, '  Novidade!  ')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(onSubmit).toHaveBeenCalledWith({ text: 'Novidade!', linkedEventId: undefined })
    expect(field).toHaveValue('')
  })

  it('voluntários, sem eventos, não veem o seletor de evento', () => {
    render(<PostComposer busy={false} events={[]} onSubmit={vi.fn()} />)
    expect(screen.queryByLabelText('Divulgar um evento')).not.toBeInTheDocument()
  })

  it('ONGs podem divulgar um dos seus eventos publicados', async () => {
    const onSubmit = vi.fn()
    render(<PostComposer busy={false} events={[event('e-1', 'Mutirão'), event('e-2', 'Feira')]} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Venha!')
    await userEvent.selectOptions(screen.getByLabelText('Divulgar um evento'), 'e-2')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(onSubmit).toHaveBeenCalledWith({ text: 'Venha!', linkedEventId: 'e-2' })
    expect(screen.getByLabelText('Divulgar um evento')).toHaveValue('')
  })

  it('enquanto publica, bloqueia o botão', async () => {
    render(<PostComposer busy events={[]} onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('O que você quer compartilhar?'), 'Olá')
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled()
  })
})
