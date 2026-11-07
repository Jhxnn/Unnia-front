import { describe, expect, it } from 'vitest'
import { dateParts, formatFullDate, formatPeriod, formatShort, localInputToIso, pluralize, toLocalInput } from './format'

/** Instante em hora local, para os testes não dependerem do fuso da máquina. */
function local(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

describe('dateParts', () => {
  it('separa dia da semana, dia, mês e hora em português', () => {
    expect(dateParts(local(2026, 11, 14, 9, 30))).toEqual({ weekday: 'sáb', day: '14', month: 'nov', time: '09:30' })
  })

  it('não deixa pontos de abreviação', () => {
    const parts = dateParts(local(2026, 9, 1, 18, 0))

    expect(parts.month).not.toContain('.')
    expect(parts.weekday).not.toContain('.')
  })
})

describe('formatFullDate', () => {
  it('traz dia da semana, dia e mês por extenso, sem a hora', () => {
    expect(formatFullDate(local(2026, 11, 14, 9, 30))).toBe('sábado, 14 de novembro')
  })
})

describe('formatShort', () => {
  it('traz dia, mês e hora', () => {
    expect(formatShort(local(2026, 11, 7, 14, 46))).toBe('7 nov, 14:46')
  })
})

describe('formatPeriod', () => {
  it('no mesmo dia mostra só a hora de fim', () => {
    expect(formatPeriod(local(2026, 11, 14, 9), local(2026, 11, 14, 13))).toBe('14 nov, 09:00 às 13:00')
  })

  it('entre dias mostra as duas datas', () => {
    expect(formatPeriod(local(2026, 11, 14, 22), local(2026, 11, 15, 2))).toBe('14 nov, 22:00 até 15 nov, 02:00')
  })
})

describe('datetime-local', () => {
  it('ida e volta preservam o instante', () => {
    const date = new Date(2026, 10, 14, 9, 30)

    expect(toLocalInput(date)).toBe('2026-11-14T09:30')
    expect(localInputToIso('2026-11-14T09:30')).toBe(date.toISOString())
  })
})

describe('pluralize', () => {
  it('concorda com a quantidade', () => {
    expect(pluralize(1, 'vaga livre', 'vagas livres')).toBe('1 vaga livre')
    expect(pluralize(0, 'vaga livre', 'vagas livres')).toBe('0 vagas livres')
    expect(pluralize(12, 'vaga livre', 'vagas livres')).toBe('12 vagas livres')
  })
})
