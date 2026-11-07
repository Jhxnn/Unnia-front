import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../test/helpers'
import { CepNotFoundError, formatCep, isCompleteCep, lookupCep, onlyDigits } from './viacep'

describe('máscara do CEP', () => {
  it('mantém só os números e coloca o hífen depois do quinto', () => {
    expect(formatCep('50030230')).toBe('50030-230')
    expect(formatCep('50030-230')).toBe('50030-230')
    expect(formatCep('5003')).toBe('5003')
    expect(formatCep('500302')).toBe('50030-2')
  })

  it('ignora letras e o que passar de oito números', () => {
    expect(formatCep('5a0b0c3d0e2f3g0h99')).toBe('50030-230')
    expect(onlyDigits('50.030-230')).toBe('50030230')
  })

  it('só considera completo com oito números', () => {
    expect(isCompleteCep('50030-230')).toBe(true)
    expect(isCompleteCep('50030-23')).toBe(false)
    expect(isCompleteCep('')).toBe(false)
  })
})

describe('consulta ao ViaCEP', () => {
  let fetchMock: ReturnType<typeof mockFetch>

  beforeEach(() => {
    fetchMock = mockFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devolve rua, bairro, cidade e estado do CEP', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    )

    const found = await lookupCep('01310-100')

    expect(found).toEqual({
      cep: '01310-100',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://viacep.com.br/ws/01310100/json/')
  })

  it('CEP de cidade pequena vem sem rua e sem bairro, e isso não é erro', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ cep: '55000-000', logradouro: '', bairro: '', localidade: 'Nazaré', uf: 'pe' }))

    const found = await lookupCep('55000000')

    expect(found.street).toBe('')
    expect(found.city).toBe('Nazaré')
    expect(found.state).toBe('PE')
  })

  it('CEP inexistente (200 com "erro") vira CepNotFoundError', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ erro: 'true' }))

    await expect(lookupCep('99999999')).rejects.toBeInstanceOf(CepNotFoundError)
  })

  it('o "erro" também pode vir como booleano', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ erro: true }))

    await expect(lookupCep('99999999')).rejects.toBeInstanceOf(CepNotFoundError)
  })

  it('serviço fora do ar não é "CEP não encontrado"', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))

    const failure = await lookupCep('50030230').catch((caught: unknown) => caught)

    expect(failure).toBeInstanceOf(Error)
    expect(failure).not.toBeInstanceOf(CepNotFoundError)
  })

  it('falha de rede também é repassada como erro comum', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(lookupCep('50030230')).rejects.toThrow('Failed to fetch')
  })

  it('CEP incompleto nem chega a consultar a rede', async () => {
    await expect(lookupCep('1234')).rejects.toThrow()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
