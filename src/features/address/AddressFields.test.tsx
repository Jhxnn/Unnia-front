import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CepNotFoundError, type CepLookup } from '../../lib/viacep'
import { AddressFields } from './AddressFields'
import { EMPTY_ADDRESS, type AddressMode, type AddressValue } from './address'

const FOUND: CepLookup = {
  cep: '50030-230',
  street: 'Cais do Apolo',
  neighborhood: 'Recife',
  city: 'Recife',
  state: 'PE',
}

/** Mantém o estado como o formulário real faz, e expõe o valor atual para as asserções. */
function Harness({
  mode,
  lookup,
  initial = EMPTY_ADDRESS,
  onValue,
}: {
  mode: AddressMode
  lookup: (cep: string) => Promise<CepLookup>
  initial?: AddressValue
  onValue?: (value: AddressValue) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <AddressFields
      mode={mode}
      lookup={lookup}
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

describe('AddressFields', () => {
  it('ao completar o CEP, consulta e preenche rua, bairro, cidade e estado', async () => {
    const lookup = vi.fn().mockResolvedValue(FOUND)
    render(<Harness mode="full" lookup={lookup} />)

    await userEvent.type(screen.getByLabelText('CEP'), '50030230')

    await waitFor(() => expect(screen.getByLabelText('Endereço')).toHaveValue('Cais do Apolo'))
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(lookup.mock.calls[0]?.[0]).toBe('50030-230')
    expect(screen.getByLabelText('Bairro')).toHaveValue('Recife')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Recife')
    expect(screen.getByLabelText('Estado')).toHaveValue('PE')
    expect(screen.getByLabelText('CEP')).toHaveValue('50030-230')
    expect(screen.getByText(/Endereço encontrado/)).toBeInTheDocument()
  })

  it('digitar o CEP aplica a máscara e não consulta antes dos oito números', async () => {
    const lookup = vi.fn().mockResolvedValue(FOUND)
    render(<Harness mode="full" lookup={lookup} />)

    await userEvent.type(screen.getByLabelText('CEP'), '500302')

    expect(screen.getByLabelText('CEP')).toHaveValue('50030-2')
    expect(lookup).not.toHaveBeenCalled()
  })

  it('no modo região, só cidade e estado são preenchidos e os campos de rua nem aparecem', async () => {
    const lookup = vi.fn().mockResolvedValue(FOUND)
    render(<Harness mode="region" lookup={lookup} />)

    expect(screen.queryByLabelText('Endereço')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('CEP'), '50030230')

    await waitFor(() => expect(screen.getByLabelText('Cidade')).toHaveValue('Recife'))
    expect(screen.getByLabelText('Estado')).toHaveValue('PE')
  })

  it('CEP de cidade pequena, sem rua, não apaga o que a pessoa já digitou', async () => {
    const lookup = vi.fn().mockResolvedValue({ ...FOUND, street: '', neighborhood: '', city: 'Nazaré', state: 'PE' })
    render(<Harness mode="full" lookup={lookup} initial={{ ...EMPTY_ADDRESS, street: 'Sítio Boa Vista' }} />)

    await userEvent.type(screen.getByLabelText('CEP'), '55000000')

    await waitFor(() => expect(screen.getByLabelText('Cidade')).toHaveValue('Nazaré'))
    expect(screen.getByLabelText('Endereço')).toHaveValue('Sítio Boa Vista')
  })

  it('CEP inexistente avisa e deixa preencher à mão', async () => {
    const lookup = vi.fn().mockRejectedValue(new CepNotFoundError())
    render(<Harness mode="full" lookup={lookup} />)

    await userEvent.type(screen.getByLabelText('CEP'), '99999999')

    expect(await screen.findByText(/CEP não encontrado/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Cidade'), 'Recife')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Recife')
  })

  it('serviço fora do ar também avisa, sem dizer que o CEP não existe', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('rede'))
    render(<Harness mode="full" lookup={lookup} />)

    await userEvent.type(screen.getByLabelText('CEP'), '50030230')

    expect(await screen.findByText(/Não foi possível consultar o CEP agora/)).toBeInTheDocument()
    expect(screen.queryByText(/CEP não encontrado/)).not.toBeInTheDocument()
  })

  it('o que a consulta preencheu continua editável', async () => {
    const lookup = vi.fn().mockResolvedValue(FOUND)
    render(<Harness mode="full" lookup={lookup} />)
    await userEvent.type(screen.getByLabelText('CEP'), '50030230')
    await waitFor(() => expect(screen.getByLabelText('Endereço')).toHaveValue('Cais do Apolo'))

    await userEvent.type(screen.getByLabelText('Número'), '120')
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'SP')

    expect(screen.getByLabelText('Número')).toHaveValue('120')
    expect(screen.getByLabelText('Estado')).toHaveValue('SP')
  })

  it('uma resposta atrasada de um CEP antigo não sobrescreve o CEP novo', async () => {
    let resolveFirst: (value: CepLookup) => void = () => undefined
    const lookup = vi
      .fn()
      .mockImplementationOnce(() => new Promise<CepLookup>((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ ...FOUND, city: 'São Paulo', state: 'SP', street: 'Avenida Paulista', cep: '01310-100' })
    render(<Harness mode="full" lookup={lookup} />)
    const cep = screen.getByLabelText('CEP')

    await userEvent.type(cep, '50030230')
    await userEvent.clear(cep)
    await userEvent.type(cep, '01310100')
    await waitFor(() => expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo'))
    resolveFirst(FOUND)

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo')
  })

  it('mostra os erros de validação recebidos nos campos certos', () => {
    render(
      <AddressFields
        mode="full"
        value={EMPTY_ADDRESS}
        onChange={() => undefined}
        errors={{ cep: 'Informe o CEP.', street: 'Informe a rua.', city: 'Informe a cidade.', state: 'Escolha o estado.' }}
      />,
    )

    for (const message of ['Informe o CEP.', 'Informe a rua.', 'Informe a cidade.', 'Escolha o estado.']) {
      expect(screen.getByText(message)).toBeInTheDocument()
    }
  })
})
