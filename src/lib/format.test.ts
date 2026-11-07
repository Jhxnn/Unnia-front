import { describe, expect, it } from 'vitest'
import { dateParts, formatFullDate, formatPeriod, formatShort, initialOf, localInputToIso, pluralize, timeAgo, toLocalInput } from './format'

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

describe('timeAgo', () => {
  const now = new Date(2026, 10, 7, 12, 0, 0)
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  it('descreve o passado recente em palavras', () => {
    expect(timeAgo(ago(20_000), now)).toBe('agora')
    expect(timeAgo(ago(5 * 60_000), now)).toBe('há 5 min')
    expect(timeAgo(ago(3 * 3600_000), now)).toBe('há 3 h')
    expect(timeAgo(ago(24 * 3600_000), now)).toBe('há 1 dia')
    expect(timeAgo(ago(3 * 24 * 3600_000), now)).toBe('há 3 dias')
  })

  it('depois de uma semana mostra a data', () => {
    expect(timeAgo(new Date(2026, 9, 20, 9, 30).toISOString(), now)).toBe('20 out, 09:30')
  })

  it('um horário no futuro (relógios desencontrados) vira "agora"', () => {
    expect(timeAgo(new Date(now.getTime() + 60_000).toISOString(), now)).toBe('agora')
  })
})

describe('initialOf', () => {
  it('usa a primeira letra, em maiúscula', () => {
    expect(initialOf('  maria souza')).toBe('M')
    expect(initialOf('')).toBe('?')
  })
})
