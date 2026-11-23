import { differenceInCalendarDays } from 'date-fns'

import { COLLECTION_NAMES, type Database } from '@/types'

/**
 * BASE DEMONSTRATIVA SEMPRE ATUAL
 * ─────────────────────────────────────────────────────────────────────────────
 * As datas da base são relativas ao dia em que ela foi gerada. Se o app for aberto
 * dias depois (por exemplo, no celular de um jurado que escaneou o QR Code antes),
 * os "próximos eventos" já teriam passado e os gráficos estariam defasados.
 *
 * Para evitar isso, ao carregar a base em um novo dia TODAS as datas avançam juntas
 * pelo número de dias decorridos — o conteúdo criado pelo usuário é preservado e
 * mantém a mesma "idade" relativa.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/
const DAY_MS = 86_400_000

/** Devolve uma cópia da estrutura com todas as datas ISO deslocadas em `ms`. */
export function shiftDates<T>(value: T, ms: number): T {
  if (typeof value === 'string') {
    if (value.length <= 30 && ISO_DATE.test(value)) {
      return new Date(new Date(value).getTime() + ms).toISOString() as T
    }
    return value
  }
  if (Array.isArray(value)) return value.map((item) => shiftDates(item, ms)) as T
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) result[key] = shiftDates(item, ms)
    return result as T
  }
  return value
}

/**
 * Avança as datas do banco quando ele foi atualizado pela última vez em um dia anterior.
 * Altera o banco recebido e devolve `true` se houve deslocamento.
 */
export function rebaseDatabase(db: Database, now: Date): boolean {
  const reference = new Date(db.meta.rebasedAt ?? db.meta.seededAt)
  const days = differenceInCalendarDays(now, reference)
  if (!Number.isFinite(days) || days < 1) return false

  const ms = days * DAY_MS
  const target = db as unknown as Record<string, unknown>
  for (const name of COLLECTION_NAMES) target[name] = shiftDates(db[name], ms)
  db.meta = {
    ...db.meta,
    seededAt: shiftDates(db.meta.seededAt, ms),
    rebasedAt: now.toISOString(),
  }
  return true
}
