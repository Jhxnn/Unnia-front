const LOCALE = 'pt-BR'

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const dayMonthFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })
const fullFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })

function clean(text: string): string {
  return text.replace(/\./g, '')
}

/** "14 nov": o formato curto de pt-BR traz "de" ("14 de nov."), então o texto é montado das partes. */
function shortDate(date: Date): string {
  const parts = dayMonthFormat.formatToParts(date)
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const month = clean(parts.find((part) => part.type === 'month')?.value ?? '')
  return `${day} ${month}`
}

export interface DateParts {
  /** "sáb" */
  weekday: string
  /** "14" */
  day: string
  /** "nov" */
  month: string
  /** "09:00" */
  time: string
}

/** Partes da data de início para o "bloco de data" dos cartões. */
export function dateParts(iso: string): DateParts {
  const date = new Date(iso)
  const parts = dayMonthFormat.formatToParts(date)
  return {
    weekday: clean(weekdayFormat.format(date)),
    day: parts.find((part) => part.type === 'day')?.value ?? '',
    month: clean(parts.find((part) => part.type === 'month')?.value ?? ''),
    time: timeFormat.format(date),
  }
}

/** "sábado, 14 de novembro" (a hora vem de formatPeriod). */
export function formatFullDate(iso: string): string {
  return fullFormat.format(new Date(iso))
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "14 nov, 09:00 às 13:00" no mesmo dia; "14 nov, 22:00 até 15 nov, 02:00" entre dias. */
export function formatPeriod(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const startText = `${shortDate(start)}, ${timeFormat.format(start)}`
  if (sameDay(start, end)) {
    return `${startText} às ${timeFormat.format(end)}`
  }
  return `${startText} até ${shortDate(end)}, ${timeFormat.format(end)}`
}

/** "7 nov, 14:46" */
export function formatShort(iso: string): string {
  const date = new Date(iso)
  return `${shortDate(date)}, ${timeFormat.format(date)}`
}

/** Converte o valor de um <input type="datetime-local"> (hora local) em ISO 8601 (UTC). */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

/** Valor padrão para <input type="datetime-local"> a partir de um instante. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "1 vaga livre", "12 vagas livres". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias"; depois de uma semana, a data curta. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'agora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  return formatShort(iso)
}

/** Primeira letra do nome, para o avatar. */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}
