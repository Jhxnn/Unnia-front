import { ApiError, describeError } from './api/errors'

export interface FormErrors {
  /** Erros por campo, usando os mesmos nomes do corpo da requisição. */
  fields: Record<string, string>
  /** Erro que não pertence a nenhum campo. */
  form: string | null
}

/** Palavra que aparece na mensagem do backend → campo do formulário a que ela se refere. */
const FIELD_HINTS: Array<[RegExp, string]> = [
  [/e-?mail/i, 'email'],
  [/cnpj/i, 'cnpj'],
  [/senha/i, 'password'],
]

/**
 * Distribui um erro da API entre os campos do formulário. A API informa os campos inválidos em 400
 * (validação); em 409 (já cadastrado) e 422 (regra de negócio) só manda uma frase, então o campo é
 * deduzido pelo assunto da frase. O que não der para atribuir vira erro do formulário.
 */
export function formErrorsFrom(error: unknown): FormErrors {
  if (!(error instanceof ApiError)) {
    return { fields: {}, form: describeError(error) }
  }
  if (Object.keys(error.fields).length > 0) {
    return { fields: { ...error.fields }, form: null }
  }
  if (error.status === 409 || error.status === 422) {
    const hint = FIELD_HINTS.find(([pattern]) => pattern.test(error.message))
    if (hint) return { fields: { [hint[1]]: error.message }, form: null }
  }
  return { fields: {}, form: describeError(error) }
}

/** Aceita só caminhos internos, para o parâmetro `next` não virar redirecionamento para outro site. */
export function safeNext(next: string | null, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback
  return next
}
