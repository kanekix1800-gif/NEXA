import type { TransitLine } from '@/types'

/** Converte "HH:mm" em minutos desde a meia-noite (ou `null` se o texto for inválido). */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Formata minutos desde a meia-noite como "HH:mm". */
export function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

type Schedule = Pick<TransitLine, 'firstDeparture' | 'lastDeparture' | 'frequencyMinutes'>

/**
 * Próximas partidas de hoje a partir de `now` (horário do aparelho), no formato "HH:mm".
 * Devolve lista vazia quando a operação do dia já terminou ou o horário é inválido.
 */
export function nextDepartures(line: Schedule, now: Date, count = 3): string[] {
  const first = parseClock(line.firstDeparture)
  const last = parseClock(line.lastDeparture)
  const step = Math.floor(line.frequencyMinutes)
  if (first === null || last === null || last < first || !(step > 0)) return []

  const current = now.getHours() * 60 + now.getMinutes()
  const elapsed = Math.max(0, current - first)
  let next = first + Math.ceil(elapsed / step) * step
  const departures: string[] = []
  while (next <= last && departures.length < count) {
    departures.push(formatClock(next))
    next += step
  }
  return departures
}

/** Minutos até a próxima partida (ou `null` se não houver mais partidas hoje). */
export function minutesUntilNext(line: Schedule, now: Date): number | null {
  const [next] = nextDepartures(line, now, 1)
  if (!next) return null
  const minutes = parseClock(next)
  if (minutes === null) return null
  return Math.max(0, minutes - (now.getHours() * 60 + now.getMinutes()))
}
