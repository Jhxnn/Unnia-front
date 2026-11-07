import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ToastProvider'
import { ApiError } from '../lib/api/errors'
import type { Me } from '../lib/api/types'

const state = vi.hoisted(() => ({
  me: null as Me | null,
  saveProfile: vi.fn(),
  changePassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../features/auth/useMe', () => ({
  useMe: () => ({ me: state.me, isLoading: false }),
  meKey: (id: string | undefined) => ['me', id],
}))
vi.mock('../features/auth/useSession', () => ({
  useSession: () => ({ status: 'authenticated', session: { accountId: 'acc-1', role: state.me?.role } }),
}))
vi.mock('../features/events/queries', () => ({
  useOrganizer: (id: string | undefined) => ({
    isPending: false,
    isError: false,
    data: id ? { name: 'Rede Mãos', city: 'Recife', description: 'Sobre a rede' } : undefined,
  }),
}))
vi.mock('../features/profiles/queries', () => ({
  useVolunteer: (id: string | undefined) => ({
    isPending: false,
    isError: false,
    data: id ? { name: 'Maria Souza', city: 'Recife', bio: 'Estudante' } : undefined,
  }),
  useUpdateProfile: () => ({ mutateAsync: state.saveProfile, isPending: false }),
  useChangePassword: () => ({ mutateAsync: state.changePassword, isPending: false }),
}))
vi.mock('../lib/api/client', () => ({ signOut: state.signOut }))

import { EditProfilePage } from './EditProfilePage'

function me(overrides: Partial<Me> = {}): Me {
  return {
    accountId: 'acc-1',
    email: 'maria@x.com',
    role: 'VOLUNTEER',
    profileId: 'vol-1',
    name: 'Maria Souza',
    city: 'Recife',
    verificationStatus: null,
    ...overrides,
  }
}

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <MemoryRouter>
          <EditProfilePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

async function fillPassword(current: string, next: string, confirm: string) {
  await userEvent.type(screen.getByLabelText('Senha atual'), current)
  await userEvent.type(screen.getByLabelText('Nova senha'), next)
  await userEvent.type(screen.getByLabelText('Repita a nova senha'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }))
}

describe('EditProfilePage', () => {
  beforeEach(() => {
    state.me = me()
    state.saveProfile.mockReset().mockResolvedValue(undefined)
    state.changePassword.mockReset().mockResolvedValue(undefined)
    state.signOut.mockReset().mockResolvedValue(undefined)
  })

  it('voluntários editam nome, cidade e "Sobre você", já preenchidos', () => {
    setup()

    expect(screen.getByLabelText('Nome')).toHaveValue('Maria Souza')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Recife')
    expect(screen.getByLabelText('Sobre você')).toHaveValue('Estudante')
  })

  it('ONGs editam a descrição, com o rótulo próprio', () => {
    state.me = me({ role: 'NGO', profileId: 'ngo-1', name: 'Rede Mãos' })
    setup()

    expect(screen.getByLabelText('Sobre a ONG')).toHaveValue('Sobre a rede')
  })

  it('administradores não têm perfil para editar, só a senha', () => {
    state.me = me({ role: 'ADMIN', profileId: null, name: null })
    setup()

    expect(screen.queryByRole('region', { name: 'Dados do perfil' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trocar senha' })).toBeInTheDocument()
  })

  it('salvar envia os dados aparados no formato do voluntário', async () => {
    setup()

    const name = screen.getByLabelText('Nome')
    await userEvent.clear(name)
    await userEvent.type(name, '  Maria Lima  ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(state.saveProfile).toHaveBeenCalledWith({
      kind: 'VOLUNTEER',
      data: { name: 'Maria Lima', city: 'Recife', bio: 'Estudante' },
    })
  })

  it('para ONGs, salvar usa o campo description', async () => {
    state.me = me({ role: 'NGO', profileId: 'ngo-1', name: 'Rede Mãos' })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(state.saveProfile).toHaveBeenCalledWith({
      kind: 'NGO',
      data: { name: 'Rede Mãos', city: 'Recife', description: 'Sobre a rede' },
    })
  })

  it('mostra o erro de validação no campo certo', async () => {
    state.saveProfile.mockRejectedValue(new ApiError(400, 'Dados inválidos', { name: 'O nome é obrigatório' }))
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(await screen.findByText('O nome é obrigatório')).toBeInTheDocument()
  })

  it('a confirmação precisa ser igual à nova senha, e nada é enviado', async () => {
    setup()

    await fillPassword('senha1234', 'novaSenha456', 'outraCoisa')

    expect(await screen.findByText('A confirmação precisa ser igual à nova senha.')).toBeInTheDocument()
    expect(state.changePassword).not.toHaveBeenCalled()
  })

  it('senha atual incorreta aparece no campo da senha atual e mantém a sessão', async () => {
    state.changePassword.mockRejectedValue(new ApiError(401, 'Senha atual incorreta'))
    setup()

    await fillPassword('errada123', 'novaSenha456', 'novaSenha456')

    expect(await screen.findByText('Senha atual incorreta')).toBeInTheDocument()
    expect(state.signOut).not.toHaveBeenCalled()
  })

  it('trocar a senha encerra a sessão, já que o servidor encerra todas', async () => {
    setup()

    await fillPassword('senha1234', 'novaSenha456', 'novaSenha456')

    await waitFor(() => expect(state.signOut).toHaveBeenCalled())
    expect(state.changePassword).toHaveBeenCalledWith({ current: 'senha1234', next: 'novaSenha456' })
  })
})
