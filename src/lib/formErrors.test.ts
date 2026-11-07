import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError, RateLimitError } from './api/errors'
import { formErrorsFrom, safeNext } from './formErrors'

describe('formErrorsFrom', () => {
  it('usa os campos que a API devolve na validação (400)', () => {
    const errors = formErrorsFrom(new ApiError(400, 'Dados inválidos', { email: 'inválido', city: 'obrigatória' }))

    expect(errors).toEqual({ fields: { email: 'inválido', city: 'obrigatória' }, form: null })
  })

  it('atribui conflitos de cadastro ao campo certo', () => {
    expect(formErrorsFrom(new ApiError(409, 'E-mail já cadastrado')).fields).toEqual({ email: 'E-mail já cadastrado' })
    expect(formErrorsFrom(new ApiError(409, 'CNPJ já cadastrado')).fields).toEqual({ cnpj: 'CNPJ já cadastrado' })
  })

  it('atribui regras de negócio (422) ao campo do assunto', () => {
    const weak = new ApiError(422, 'A senha deve conter letras e números')
    expect(formErrorsFrom(weak)).toEqual({ fields: { password: weak.message }, form: null })
    expect(formErrorsFrom(new ApiError(422, 'CNPJ inválido')).fields).toEqual({ cnpj: 'CNPJ inválido' })
  })

  it('o que não tem campo vira erro do formulário', () => {
    expect(formErrorsFrom(new ApiError(422, 'Evento lotado'))).toEqual({ fields: {}, form: 'Evento lotado' })
    expect(formErrorsFrom(new ApiError(500, 'x')).form).toBe('x')
  })

  it('explica o rate limit e a falta de rede no formulário', () => {
    expect(formErrorsFrom(new RateLimitError('x', 120)).form).toContain('2 minutos')
    expect(formErrorsFrom(new NetworkError()).form).toContain('conexão')
  })

  it('erros desconhecidos viram uma mensagem genérica', () => {
    expect(formErrorsFrom(new Error('boom')).form).toBe('Algo deu errado. Tente novamente.')
  })
})

describe('safeNext', () => {
  it('aceita caminhos internos', () => {
    expect(safeNext('/eventos/123')).toBe('/eventos/123')
    expect(safeNext('/ong/eventos?x=1')).toBe('/ong/eventos?x=1')
  })

  it('recusa destinos externos ou malformados', () => {
    expect(safeNext('https://malicioso.com')).toBe('/')
    expect(safeNext('//malicioso.com')).toBe('/')
    expect(safeNext('/\\malicioso.com')).toBe('/')
    expect(safeNext('javascript:alert(1)')).toBe('/')
  })

  it('cai no padrão quando não há destino', () => {
    expect(safeNext(null)).toBe('/')
    expect(safeNext('')).toBe('/')
    expect(safeNext(null, '/eventos')).toBe('/eventos')
  })
})
