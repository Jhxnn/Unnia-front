import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'anonymous',
  accountId: 'acc-me',
  follow: { data: { following: false, followers: 4 } as { following: boolean; followers: number } | undefined, isPending: false },
  mutate: vi.fn(),
  followEnabled: undefined as boolean | undefined,
}))

vi.mock('../auth/useSession', () => ({
  useSession: () => ({
    status: state.status,
    session: state.status === 'authenticated' ? { accountId: state.accountId, role: 'VOLUNTEER' } : null,
  }),
}))
vi.mock('../social/queries', () => ({
  useFollowStatus: (_accountId: string, enabled: boolean) => {
    state.followEnabled = enabled
    return state.follow
  },
  useToggleFollow: () => ({ mutate: state.mutate, isPending: false }),
}))
vi.mock('../moderation/ReportButton', () => ({
  ReportButton: ({ label }: { label?: string }) => <button type="button">{label}</button>,
}))

import { ProfileActions } from './ProfileActions'

function setup(accountId = 'acc-ngo') {
  render(
    <MemoryRouter>
      <ProfileActions accountId={accountId} name="Rede Mãos" />
    </MemoryRouter>,
  )
}

describe('ProfileActions', () => {
  beforeEach(() => {
    state.status = 'authenticated'
    state.accountId = 'acc-me'
    state.follow = { data: { following: false, followers: 4 }, isPending: false }
    state.mutate.mockReset()
  })

  it('no próprio perfil, leva à edição e não oferece seguir nem denunciar', () => {
    setup('acc-me')

    expect(screen.getByRole('link', { name: 'Editar meu perfil' })).toHaveAttribute('href', '/perfil')
    expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Denunciar perfil' })).not.toBeInTheDocument()
  })

  it('visitantes recebem um convite para entrar, e a API não é consultada', () => {
    state.status = 'anonymous'
    setup()

    expect(screen.getByRole('link', { name: 'Entrar para seguir e conversar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument()
    expect(state.followEnabled).toBe(false)
  })

  it('quem está logado pode seguir, e o botão pede o inverso do estado atual', async () => {
    setup()

    const follow = screen.getByRole('button', { name: 'Seguir' })
    expect(follow).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(follow)

    expect(state.mutate).toHaveBeenCalledWith(true)
  })

  it('quem já segue vê "Seguindo" e clicar deixa de seguir', async () => {
    state.follow = { data: { following: true, followers: 5 }, isPending: false }
    setup()

    const following = screen.getByRole('button', { name: 'Seguindo' })
    expect(following).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(following)

    expect(state.mutate).toHaveBeenCalledWith(false)
  })

  it('o botão fica bloqueado até saber se já segue', () => {
    state.follow = { data: undefined, isPending: true }
    setup()

    expect(screen.getByRole('button', { name: 'Seguir' })).toBeDisabled()
  })

  it('mostra quantos seguidores a conta tem', () => {
    state.follow = { data: { following: false, followers: 1 }, isPending: false }
    setup()

    expect(screen.getByText('1 seguidor')).toBeInTheDocument()
  })

  it('enviar mensagem abre a conversa com a conta, levando o nome', () => {
    setup()

    const href = screen.getByRole('link', { name: 'Enviar mensagem' }).getAttribute('href')
    expect(href).toBe('/mensagens?para=acc-ngo&nome=Rede%20M%C3%A3os')
  })

  it('oferece denunciar o perfil', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Denunciar perfil' })).toBeInTheDocument()
  })
})
