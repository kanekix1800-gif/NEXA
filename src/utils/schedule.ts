import type { DayHours, WeekSchedule } from '@/types'

import { now } from './clock'

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/** Horário do dia informado (ou de hoje), ou `null` se o estabelecimento não abre. */
export function hoursForDay(schedule: WeekSchedule, date: Date = now()): DayHours | null {
  return schedule[date.getDay()] ?? null
}

/**
 * Indica se o estabelecimento está aberto no momento informado.
 * Suporta horários que atravessam a meia-noite (ex.: 18:00–02:00).
 */
export function isOpenAt(schedule: WeekSchedule, date: Date = now()): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes()

  const today = schedule[date.getDay()]
  if (today) {
    const open = toMinutes(today.open)
    const close = toMinutes(today.close)
    if (close > open) {
      if (minutes >= open && minutes < close) return true
    } else if (minutes >= open) {
      // Fecha depois da meia-noite.
      return true
    }
  }

  // Madrugada: ainda pode estar no turno iniciado ontem.
  const yesterday = schedule[(date.getDay() + 6) % 7]
  if (yesterday) {
    const open = toMinutes(yesterday.open)
    const close = toMinutes(yesterday.close)
    if (close <= open && minutes < close) return true
  }

  return false
}

/** "07:00" → "7h", "07:30" → "7h30". */
export function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
}

/** "7h às 19h" ou "Fechado". */
export function formatDayHours(hours: DayHours | null): string {
  return hours ? `${formatClock(hours.open)} às ${formatClock(hours.close)}` : 'Fechado'
}

/** Valida o formato "HH:mm". */
export function isValidClock(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
}

/** Horário comercial padrão sugerido em novos cadastros (seg–sex 8h–18h, sáb 8h–12h). */
export function defaultSchedule(): WeekSchedule {
  const weekday: DayHours = { open: '08:00', close: '18:00' }
  return [
    null,
    { ...weekday },
    { ...weekday },
    { ...weekday },
    { ...weekday },
    { ...weekday },
    { open: '08:00', close: '12:00' },
  ]
}
