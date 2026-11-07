import { describe, expect, it } from 'vitest'
import { EMPTY_ADDRESS, MAX_ADDRESS_LENGTH, composeAddressLine, hasAddressErrors, validateAddress } from './address'

const address = (overrides = {}) => ({ ...EMPTY_ADDRESS, ...overrides })

describe('composeAddressLine', () => {
  it('junta rua, número, complemento e bairro em uma linha', () => {
    expect(
      composeAddressLine(
        address({ street: 'Rua do Futuro', number: '120', complement: 'apto 4', neighborhood: 'Aflitos' }),
      ),
    ).toBe('Rua do Futuro, 120, apto 4 - Aflitos')
  })

  it('pula o que não foi preenchido', () => {
    expect(composeAddressLine(address({ street: 'Rua do Futuro', number: '120' }))).toBe('Rua do Futuro, 120')
    expect(composeAddressLine(address({ street: 'Cais do Apolo', neighborhood: 'Recife' }))).toBe('Cais do Apolo - Recife')
    expect(composeAddressLine(address({ street: '  Praça Central  ' }))).toBe('Praça Central')
  })

  it('sem rua não há endereço, mesmo com número e bairro', () => {
    expect(composeAddressLine(address({ number: '120', neighborhood: 'Aflitos' }))).toBe('')
  })

  it('respeita o limite de 200 caracteres do backend', () => {
    expect(composeAddressLine(address({ street: 'x'.repeat(500) }))).toHaveLength(MAX_ADDRESS_LENGTH)
  })
})

describe('validateAddress', () => {
  const complete = address({ cep: '50030-230', street: 'Cais do Apolo', city: 'Recife', state: 'PE' })

  it('endereço completo não tem erros', () => {
    expect(hasAddressErrors(validateAddress(complete, 'full', true))).toBe(false)
  })

  it('em cadastros novos o CEP é obrigatório', () => {
    expect(validateAddress(address({ ...complete, cep: '' }), 'full', true).cep).toBe('Informe o CEP para preencher o endereço.')
  })

  it('em edições o CEP pode ficar vazio, mas preenchido precisa estar completo', () => {
    expect(validateAddress(address({ ...complete, cep: '' }), 'full', false).cep).toBeUndefined()
    expect(validateAddress(address({ ...complete, cep: '5003' }), 'full', false).cep).toBe('O CEP tem 8 números.')
  })

  it('a rua só é exigida no modo completo', () => {
    const noStreet = address({ ...complete, street: '' })

    expect(validateAddress(noStreet, 'full', true).street).toBeDefined()
    expect(validateAddress(noStreet, 'region', true).street).toBeUndefined()
  })

  it('cidade e estado são sempre exigidos', () => {
    const errors = validateAddress(address({ cep: '50030-230', street: 'Rua A' }), 'full', true)

    expect(errors.city).toBe('Informe a cidade.')
    expect(errors.state).toBe('Escolha o estado.')
  })
})
