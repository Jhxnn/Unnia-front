import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ToastProvider'

const state = vi.hoisted(() => ({ volunteer: vi.fn(), ngo: vi.fn() }))

vi.mock('../lib/api/endpoints', () => ({
  authApi: { registerVolunteer: state.volunteer, registerNgo: state.ngo },
}))
// o endereço é testado à parte: aqui um botão preenche tudo de uma vez
vi.mock('../features/address/AddressFields', () => ({
  AddressFields: ({ onChange }: { onChange: (value: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({ cep: '50030-230', street: '', number: '', complement: '', neighborhood: '', city: 'Recife', state: 'PE' })
      }
    >
      preencher endereço
    </button>
  ),
}))

import { RegisterNgoPage } from './RegisterNgoPage'
import { RegisterVolunteerPage } from './RegisterVolunteerPage'

function setup(page: 'volunteer' | 'ngo') {
  render(
    <ToastProvider>
      <MemoryRouter>{page === 'volunteer' ? <RegisterVolunteerPage /> : <RegisterNgoPage />}</MemoryRouter>
    </ToastProvider>,
  )
}

async function fill(page: 'volunteer' | 'ngo', password: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(page === 'ngo' ? 'Nome da ONG' : 'Nome'), 'Maria')
  if (page === 'ngo') await user.type(screen.getByLabelText('CNPJ'), '11.222.333/0001-81')
  await user.type(screen.getByLabelText(page === 'ngo' ? 'E-mail de acesso' : 'E-mail'), 'maria@exemplo.com')
  await user.type(screen.getByLabelText('Senha'), password)
  await user.type(screen.getByLabelText('Confirmar senha'), confirm)
  await user.click(screen.getByRole('button', { name: 'preencher endereço' }))
  await user.click(screen.getByRole('button', { name: page === 'ngo' ? /Cadastrar|Criar|Enviar/ : 'Criar conta' }))
}

describe.each(['volunteer', 'ngo'] as const)('confirmação de senha (%s)', (page) => {
  beforeEach(() => {
    state.volunteer.mockReset().mockResolvedValue({ accountId: 'a', volunteerId: 'v' })
    state.ngo.mockReset().mockResolvedValue({ accountId: 'a', ngoId: 'n' })
  })

  it('tem o campo de confirmação ao lado da senha', () => {
    setup(page)

    expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute('type', 'password')
  })

  it('senhas diferentes: mostra o erro no campo e não envia o cadastro', async () => {
    setup(page)

    await fill(page, 'senha1234', 'senha4321')

    expect(await screen.findByText('A confirmação precisa ser igual à senha.')).toBeInTheDocument()
    expect(state.volunteer).not.toHaveBeenCalled()
    expect(state.ngo).not.toHaveBeenCalled()
  })

  it('senhas iguais: envia o cadastro sem mandar a confirmação para a API', async () => {
    setup(page)

    await fill(page, 'senha1234', 'senha1234')

    const call = page === 'ngo' ? state.ngo : state.volunteer
    await waitFor(() => expect(call).toHaveBeenCalled())
    const sent = call.mock.calls[0]?.[0] as Record<string, unknown>
    expect(sent.password).toBe('senha1234')
    expect(sent).not.toHaveProperty('confirm')
    expect(sent.city).toBe('Recife')
    expect(sent.state).toBe('PE')
  })
})
