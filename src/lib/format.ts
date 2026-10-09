import type { ISODate } from '../data/types'

const money = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' })
export const formatMoney = (n: number) => money.format(n)

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' alebo ISODate -> '9. 10. 2026' */
export function formatDate(d: string | undefined) {
  if (!d) return '–'
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return `${day}. ${m}. ${y}`
}

/** ISODate -> '9. 10. 2026, 09:15' */
export function formatDateTime(d: ISODate | undefined) {
  if (!d) return '–'
  return `${formatDate(d)}, ${d.slice(11, 16) || '00:00'}`
}

/** Krátky dátum '9. 10.' */
export function formatShortDate(d: string) {
  const [, m, day] = d.slice(0, 10).split('-').map(Number)
  return `${day}. ${m}.`
}

const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']
/** '2026-09' -> 'september 2026' */
export function formatPeriod(p: string | undefined) {
  if (!p) return '–'
  const [y, m] = p.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function toUTC(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

/** Počet celých dní medzi dvoma dátumami (b - a) */
export function daysBetween(a: string, b: string) {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000)
}

/** Pridá dni k ISODate, zachová čas */
export function addDays(d: ISODate, days: number): ISODate {
  const t = new Date(toUTC(d) + days * 86400000)
  const date = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
  return date + d.slice(10)
}

/** Relatívny čas voči simulovanému "dnes": 'dnes', 'včera', 'pred 3 dňami', 'o 2 dni' */
export function relativeDays(d: string, today: string) {
  const diff = daysBetween(d, today)
  if (diff === 0) return 'dnes'
  if (diff === 1) return 'včera'
  if (diff === -1) return 'zajtra'
  if (diff > 1) return `pred ${diff} ${diff < 5 ? 'dňami' : 'dňami'}`
  const n = -diff
  return `o ${n} ${n < 5 ? 'dni' : 'dní'}`
}

/** 'Platnosť' termínu: záporné = po termíne */
export function daysUntil(due: string, today: string) {
  return daysBetween(today, due)
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return `${n} ${one}`
  if (n >= 2 && n <= 4) return `${n} ${few}`
  return `${n} ${many}`
}

let counter = 0
export function uid(prefix: string) {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}
