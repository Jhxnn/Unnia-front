import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError, RateLimitError, describeError, formatWait, isApiError } from './errors'

describe('formatWait', () => {
  it('usa segundos abaixo de um minuto', () => {
    expect(formatWait(1)).toBe('1 segundo')
    expect(formatWait(45)).toBe('45 segundos')
  })

  it('arredonda para cima em minutos', () => {
    expect(formatWait(60)).toBe('1 minuto')
    expect(formatWait(61)).toBe('2 minutos')
    expect(formatWait(900)).toBe('15 minutos')
  })
})

describe('describeError', () => {
  it('explica o rate limit com o tempo de espera', () => {
    expect(describeError(new RateLimitError('x', 900))).toBe(
      'Muitas tentativas em pouco tempo. Tente de novo em 15 minutos.',
    )
  })

  it('repassa a mensagem de erros da API e de rede', () => {
    expect(describeError(new ApiError(422, 'Evento lotado'))).toBe('Evento lotado')
    expect(describeError(new NetworkError())).toContain('conexão')
  })

  it('não vaza detalhes de erros desconhecidos', () => {
    expect(describeError(new Error('TypeError: x is undefined'))).toBe('Algo deu errado. Tente novamente.')
    expect(describeError('texto solto')).toBe('Algo deu errado. Tente novamente.')
  })
})

describe('isApiError', () => {
  it('filtra por status quando informado', () => {
    const error = new ApiError(404, 'não achei')

    expect(isApiError(error)).toBe(true)
    expect(isApiError(error, 404)).toBe(true)
    expect(isApiError(error, 500)).toBe(false)
    expect(isApiError(new Error('x'))).toBe(false)
  })

  it('RateLimitError é um ApiError de status 429', () => {
    expect(isApiError(new RateLimitError('x', 5), 429)).toBe(true)
  })
})
