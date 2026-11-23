import type { GeoPoint, ID, ISODate } from '@/types'

import {
  NEIGHBORHOODS,
  PEOPLE,
  RESIDENTS,
  MERCHANTS,
  type NeighborhoodKey,
  type Offset,
  type PersonKey,
} from '../cast'
import type { SeedContext } from '../context'

/** Id da pessoa a partir da chave do elenco. */
export const uid = (key: PersonKey): ID => PEOPLE[key].id

/** Bairro de uma pessoa. */
export const homeOf = (key: PersonKey): ID => NEIGHBORHOODS[PEOPLE[key].neighborhood].id

/** Ponto próximo ao centro do bairro (deslocamento local em metros). */
export function near(
  ctx: SeedContext,
  neighborhood: NeighborhoodKey,
  north: number,
  east: number,
): GeoPoint {
  const [baseNorth, baseEast] = NEIGHBORHOODS[neighborhood].offset
  return ctx.point([baseNorth + north, baseEast + east])
}

/** Ponto a partir de um deslocamento absoluto somado a um pequeno desvio. */
export function around(ctx: SeedContext, base: Offset, north = 0, east = 0): GeoPoint {
  return ctx.point([base[0] + north, base[1] + east])
}

/** Soma horas a uma data ISO, sem ultrapassar o instante atual. */
export function plusHours(ctx: SeedContext, iso: ISODate, hours: number): ISODate {
  const target = new Date(iso).getTime() + hours * 3_600_000
  const limit = ctx.now.getTime() - 60_000
  return new Date(Math.min(target, limit)).toISOString()
}

/** Soma minutos a uma data ISO, sem ultrapassar o instante atual. */
export function plusMinutes(ctx: SeedContext, iso: ISODate, minutes: number): ISODate {
  return plusHours(ctx, iso, minutes / 60)
}

/** Pessoas que podem apoiar/curtir: moradores e comerciantes. */
const SUPPORTER_POOL: PersonKey[] = [
  ...(Object.keys(RESIDENTS) as PersonKey[]),
  ...(Object.keys(MERCHANTS) as PersonKey[]),
]

/** Todas as pessoas (para curtidas e presenças). */
const EVERYONE: PersonKey[] = Object.keys(PEOPLE) as PersonKey[]

/**
 * Escolhe `count` ids de forma determinística (rotação pela semente), excluindo as
 * pessoas indicadas. Usado para apoios, curtidas e presenças.
 */
export function pickPeople(
  count: number,
  seed: number,
  exclude: readonly PersonKey[] = [],
  pool: readonly PersonKey[] = SUPPORTER_POOL,
): ID[] {
  const eligible = pool.filter((key) => !exclude.includes(key))
  const start = (seed * 5) % eligible.length
  const ids: ID[] = []
  for (let i = 0; i < count; i += 1) {
    const key = eligible[(start + i * 3) % eligible.length]
    if (key !== undefined && !ids.includes(uid(key))) ids.push(uid(key))
    else {
      const fallback = eligible[(start + i * 3 + 1) % eligible.length]
      if (fallback !== undefined && !ids.includes(uid(fallback))) ids.push(uid(fallback))
    }
  }
  // Garante a quantidade pedida caso a rotação tenha repetido alguém.
  for (const key of eligible) {
    if (ids.length >= count) break
    if (!ids.includes(uid(key))) ids.push(uid(key))
  }
  return ids.slice(0, count)
}

/** Curtidas de qualquer usuário (inclusive contas institucionais). */
export function pickLikers(count: number, seed: number, exclude: readonly PersonKey[]): ID[] {
  return pickPeople(count, seed, exclude, EVERYONE)
}
