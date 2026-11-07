import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NgoCard } from '../lib/api/types'

function result(ngos: NgoCard[], extra: Record<string, unknown> = {}) {
  return {
    isPending: false,
    isError: false,
    error: null as unknown,
    data: { pages: [ngos] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...extra,
  }
}

const state = vi.hoisted(() => ({ query: null as ReturnType<typeof result> | null }))

vi.mock('../features/profiles/queries', () => ({ useNgoShowcase: () => state.query }))

import { NgosPage } from './NgosPage'

function ngo(id: string, name: string): NgoCard {
  return { ngoId: id, accountId: `acc-${id}`, name, description: `Sobre ${name}`, city: 'Recife', state: 'PE' }
}

function setup() {
  render(
    <MemoryRouter>
      <NgosPage />
    </MemoryRouter>,
  )
}

describe('NgosPage', () => {
  beforeEach(() => {
    state.query = result([ngo('n-1', 'Casa Viva'), ngo('n-2', 'Horta Boa Vista')])
  })

  it('lista as ONGs verificadas com link para o perfil de cada uma', () => {
    setup()

    const card = screen.getByRole('link', { name: /Casa Viva/ })
    expect(card).toHaveAttribute('href', '/ongs/n-1')
    expect(screen.getByText('Sobre Casa Viva')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Horta Boa Vista/ })).toHaveAttribute('href', '/ongs/n-2')
  })

  it('sem ONGs verificadas, explica quando elas aparecem', () => {
    state.query = result([])
    setup()

    expect(screen.getByText('Nenhuma ONG verificada ainda')).toBeInTheDocument()
  })

  it('erro ao carregar oferece tentar de novo', async () => {
    const refetch = vi.fn()
    state.query = result([], { isError: true, error: new Error('falhou'), refetch })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(refetch).toHaveBeenCalled()
  })

  it('com mais páginas, oferece carregar mais', async () => {
    const fetchNextPage = vi.fn()
    state.query = result([ngo('n-1', 'Casa Viva')], { hasNextPage: true, fetchNextPage })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(fetchNextPage).toHaveBeenCalled()
  })
})
