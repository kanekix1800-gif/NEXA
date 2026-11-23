import { config } from '@/config'
import type { Database, GeoPoint, ISODate } from '@/types'
import { offsetPoint } from '@/utils/geo'

import type { Offset } from './cast'

/**
 * Contexto compartilhado pelos geradores da base demonstrativa.
 * Tudo é relativo a `now` (datas) e ao centro configurado do mapa (posições),
 * o que mantém a demonstração sempre atual e permite levá-la para outra cidade
 * alterando apenas variáveis de ambiente.
 */
export interface SeedContext {
  now: Date
  /**
   * Data relativa em dias, no horário local do dispositivo.
   * `at(-2, 14, 30)` = dois dias atrás às 14h30; `at(3, 9)` = daqui a três dias às 9h.
   */
  at(dayOffset: number, hour?: number, minute?: number): ISODate
  /** Momento relativo em minutos: `ago(90)` = 90 minutos atrás. */
  ago(minutes: number): ISODate
  /** Converte um deslocamento (norte, leste) em metros para coordenadas no mapa. */
  point(offset: Offset): GeoPoint
  /** Gerador pseudoaleatório DETERMINÍSTICO (0 ≤ n < 1): a base é sempre a mesma. */
  random(): number
  /** Inteiro determinístico no intervalo [min, max]. */
  randomInt(min: number, max: number): number
  /** Escolhe um item de forma determinística. */
  pick<T>(items: readonly T[]): T
}

/** Gerador mulberry32 — pequeno, rápido e suficiente para dados demonstrativos. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeedContext(now: Date, seed = 20261122): SeedContext {
  const random = mulberry32(seed)
  const center = config.map.center

  return {
    now,
    at(dayOffset, hour = 12, minute = 0) {
      const date = new Date(now)
      date.setDate(date.getDate() + dayOffset)
      date.setHours(hour, minute, 0, 0)
      return date.toISOString()
    },
    ago(minutes) {
      return new Date(now.getTime() - minutes * 60_000).toISOString()
    },
    point([north, east]) {
      return offsetPoint(center, north, east)
    },
    random,
    randomInt(min, max) {
      return Math.floor(random() * (max - min + 1)) + min
    },
    pick(items) {
      const item = items[Math.floor(random() * items.length)]
      if (item === undefined) throw new Error('Lista vazia em pick().')
      return item
    },
  }
}

/** Parte "estrutural" da base: lugares, pessoas, categorias, instituições e comércio. */
export type CoreSeed = Pick<
  Database,
  | 'neighborhoods'
  | 'users'
  | 'userSettings'
  | 'categories'
  | 'institutions'
  | 'publicServices'
  | 'businesses'
  | 'reviews'
  | 'favorites'
  | 'products'
  | 'sales'
  | 'transactions'
  | 'transitLines'
  | 'transitStops'
  | 'accessPoints'
>

/** Parte "viva" da base: publicações, demandas, eventos, iniciativas, notificações e notícias. */
export type CommunitySeed = Pick<
  Database,
  'posts' | 'comments' | 'reports' | 'demands' | 'events' | 'initiatives' | 'notifications' | 'news'
> & {
  /** Última sequência usada nos protocolos das demandas (NX-AAAA-NNNN). */
  demandSequence: number
}
