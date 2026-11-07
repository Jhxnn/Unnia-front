import { isCompleteCep } from '../../lib/viacep'

/** Os campos do endereço como o usuário os vê. Para a API, rua, número, complemento e bairro viram uma linha só. */
export interface AddressValue {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  /** Sigla da UF; vazio enquanto não escolhida. */
  state: string
}

export const EMPTY_ADDRESS: AddressValue = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}

export const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ',
  'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/** O backend guarda o endereço em até 200 caracteres. */
export const MAX_ADDRESS_LENGTH = 200

/**
 * "Rua do Futuro, 120, apto 4 - Aflitos". Sem rua, devolve vazio: não existe endereço só com número.
 */
export function composeAddressLine(address: AddressValue): string {
  const street = address.street.trim()
  if (!street) return ''
  const parts = [street, address.number.trim(), address.complement.trim()].filter(Boolean)
  const neighborhood = address.neighborhood.trim()
  const line = neighborhood ? `${parts.join(', ')} - ${neighborhood}` : parts.join(', ')
  return line.slice(0, MAX_ADDRESS_LENGTH)
}

export type AddressMode = 'full' | 'region'

export interface AddressErrors {
  cep?: string
  street?: string
  city?: string
  state?: string
}

/**
 * Confere o que o formulário exige. `requireCep` vale para cadastros novos; em edições o CEP pode continuar
 * vazio, pois os registros antigos não o têm.
 */
export function validateAddress(address: AddressValue, mode: AddressMode, requireCep: boolean): AddressErrors {
  const errors: AddressErrors = {}
  if (address.cep.trim() && !isCompleteCep(address.cep)) {
    errors.cep = 'O CEP tem 8 números.'
  } else if (requireCep && !address.cep.trim()) {
    errors.cep = 'Informe o CEP para preencher o endereço.'
  }
  if (mode === 'full' && !address.street.trim()) errors.street = 'Informe a rua e o local do evento.'
  if (!address.city.trim()) errors.city = 'Informe a cidade.'
  if (!address.state) errors.state = 'Escolha o estado.'
  return errors
}

export function hasAddressErrors(errors: AddressErrors): boolean {
  return Object.keys(errors).length > 0
}
