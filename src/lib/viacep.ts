/**
 * Consulta de CEP no ViaCEP (https://viacep.com.br), serviço público e gratuito que libera chamadas direto do
 * navegador. A consulta é só uma ajuda de preenchimento: o que o usuário confirma no formulário é o que vai
 * para a API do Unnia, e ele pode corrigir qualquer campo.
 */

export interface CepLookup {
  /** "50030-230" */
  cep: string
  /** Pode vir vazio: CEPs de cidades pequenas cobrem a cidade inteira e não têm rua. */
  street: string
  neighborhood: string
  city: string
  /** Sigla da UF, como "PE". */
  state: string
}

/** O CEP tem o formato certo, mas não existe na base dos Correios. */
export class CepNotFoundError extends Error {
  constructor() {
    super('CEP não encontrado')
    this.name = 'CepNotFoundError'
  }
}

const VIACEP_URL = 'https://viacep.com.br/ws'

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Máscara enquanto digita: "50030230" vira "50030-230"; menos de 6 dígitos ficam sem hífen. */
export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export function isCompleteCep(value: string): boolean {
  return onlyDigits(value).length === 8
}

interface ViaCepResponse {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean | string
}

/**
 * Busca o endereço de um CEP de 8 dígitos.
 * @throws CepNotFoundError se o CEP não existe
 * @throws Error se o serviço não respondeu (rede fora, ViaCEP indisponível ou CEP malformado)
 */
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepLookup> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) {
    throw new Error('O CEP precisa ter 8 números')
  }

  const response = await fetch(`${VIACEP_URL}/${digits}/json/`, { signal })
  if (!response.ok) {
    throw new Error(`ViaCEP respondeu ${response.status}`)
  }
  const body = (await response.json()) as ViaCepResponse
  // CEP inexistente volta 200 com {"erro": "true"} (às vezes booleano)
  if (body.erro === true || body.erro === 'true') {
    throw new CepNotFoundError()
  }
  return {
    cep: formatCep(body.cep ?? digits),
    street: body.logradouro?.trim() ?? '',
    neighborhood: body.bairro?.trim() ?? '',
    city: body.localidade?.trim() ?? '',
    state: body.uf?.trim().toUpperCase() ?? '',
  }
}
