import {
  addDays as addDaysFn,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfDay as endOfDayFn,
  format,
  isSameDay as isSameDayFn,
  startOfDay as startOfDayFn,
  subDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

import type { DateRange, ISODate, PeriodPreset } from '@/types'

import { now } from './clock'

type DateInput = ISODate | Date

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * Tempo relativo curto, no estilo do feed: "Agora", "Há 5 min", "Há 2h", "Ontem",
 * "Há 3 dias" e, a partir de uma semana, a data ("12 nov" ou "12 nov 2025").
 */
export function timeAgo(value: DateInput, reference: Date = now()): string {
  const date = toDate(value)
  const minutes = differenceInMinutes(reference, date)
  if (minutes < 1) return 'Agora'
  if (minutes < 60) return `Há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24 && isSameDayFn(date, reference)) return `Há ${hours}h`
  const days = differenceInCalendarDays(reference, date)
  if (days <= 0) return `Há ${hours}h`
  if (days === 1) return 'Ontem'
  if (days < 7) return `Há ${days} dias`
  return date.getFullYear() === reference.getFullYear()
    ? format(date, "d 'de' MMM", { locale: ptBR })
    : format(date, "d 'de' MMM 'de' yyyy", { locale: ptBR })
}

/** "22/11/2026" */
export function formatDate(value: DateInput): string {
  return format(toDate(value), 'dd/MM/yyyy')
}

/** "22 de novembro de 2026" */
export function formatDateLong(value: DateInput): string {
  return format(toDate(value), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/** "22/11/2026 às 14:30" */
export function formatDateTime(value: DateInput): string {
  return format(toDate(value), "dd/MM/yyyy 'às' HH:mm")
}

/** "14:30" */
export function formatTime(value: DateInput): string {
  return format(toDate(value), 'HH:mm')
}

/** "22/11" — rótulo curto para eixos de gráficos. */
export function formatDayMonth(value: DateInput): string {
  return format(toDate(value), 'dd/MM')
}

/** "sábado, 22 de novembro" */
export function formatWeekdayDate(value: DateInput): string {
  return format(toDate(value), "EEEE, d 'de' MMMM", { locale: ptBR })
}

/** Partes para o selo de data dos eventos: { day: "25", month: "NOV", weekday: "qua" }. */
export function dateBadgeParts(value: DateInput): { day: string; month: string; weekday: string } {
  const date = toDate(value)
  return {
    day: format(date, 'd'),
    month: format(date, 'MMM', { locale: ptBR }).replace('.', '').toUpperCase(),
    weekday: format(date, 'EEE', { locale: ptBR }).replace('.', ''),
  }
}

/** Hora compacta: 09:00 → "9h", 09:30 → "9h30". */
export function formatHourCompact(value: DateInput): string {
  const date = toDate(value)
  const minutes = date.getMinutes()
  return minutes === 0
    ? `${date.getHours()}h`
    : `${date.getHours()}h${String(minutes).padStart(2, '0')}`
}

/**
 * Intervalo de horário de um evento: "Das 9h às 17h".
 * Se terminar em outro dia: "De 25/11 às 9h até 26/11 às 17h".
 */
export function formatEventTimeRange(startsAt: DateInput, endsAt: DateInput): string {
  const start = toDate(startsAt)
  const end = toDate(endsAt)
  if (isSameDayFn(start, end)) {
    return `Das ${formatHourCompact(start)} às ${formatHourCompact(end)}`
  }
  return `De ${formatDayMonth(start)} às ${formatHourCompact(start)} até ${formatDayMonth(end)} às ${formatHourCompact(end)}`
}

/** Valor para `<input type="datetime-local">` no fuso do dispositivo. */
export function toDateTimeLocalValue(value: DateInput): string {
  return format(toDate(value), "yyyy-MM-dd'T'HH:mm")
}

/** Valor para `<input type="date">`. */
export function toDateInputValue(value: DateInput): string {
  return format(toDate(value), 'yyyy-MM-dd')
}

/** Converte o valor de um `<input type="date">` ("2026-11-22") em ISO, ao meio-dia local. */
export function fromDateInputValue(value: string): ISODate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function startOfDay(value: DateInput): Date {
  return startOfDayFn(toDate(value))
}

export function endOfDay(value: DateInput): Date {
  return endOfDayFn(toDate(value))
}

export function addDays(value: DateInput, amount: number): Date {
  return addDaysFn(toDate(value), amount)
}

export function isSameDay(a: DateInput, b: DateInput): boolean {
  return isSameDayFn(toDate(a), toDate(b))
}

/** Verifica se a data está dentro do intervalo (inclusive). */
export function isWithinRange(value: DateInput, range: DateRange | undefined): boolean {
  if (!range) return true
  const time = toDate(value).getTime()
  return time >= new Date(range.from).getTime() && time <= new Date(range.to).getTime()
}

const PRESET_DAYS: Record<PeriodPreset, number> = { '7d': 7, '30d': 30, '90d': 90 }

/**
 * Intervalo de um período pré-definido, terminando hoje (inclusive).
 * "7d" = hoje e os 6 dias anteriores.
 */
export function rangeForPreset(preset: PeriodPreset, reference: Date = now()): DateRange {
  const days = PRESET_DAYS[preset]
  return {
    from: startOfDayFn(subDays(reference, days - 1)).toISOString(),
    to: endOfDayFn(reference).toISOString(),
  }
}

/** Intervalo imediatamente anterior, com a mesma duração em dias. */
export function previousRange(range: DateRange): DateRange {
  const from = new Date(range.from)
  const to = new Date(range.to)
  const days = differenceInCalendarDays(to, from) + 1
  return {
    from: startOfDayFn(subDays(from, days)).toISOString(),
    to: endOfDayFn(subDays(from, 1)).toISOString(),
  }
}

/** Quantidade de dias corridos de um intervalo (inclusive). */
export function rangeDays(range: DateRange): number {
  return differenceInCalendarDays(new Date(range.to), new Date(range.from)) + 1
}

/** Converte o valor de um `<input type="datetime-local">` (horário do aparelho) em ISO. */
export function fromDateTimeLocalValue(value: string): ISODate | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
