import {
  COLLECTION_NAMES,
  DATABASE_SCHEMA_VERSION,
  type CollectionName,
  type Database,
} from '@/types'

import { rebaseDatabase } from './rebase'

/**
 * ATUALIZAÇÃO DE BASES ANTIGAS
 * ─────────────────────────────────────────────────────────────────────────────
 * Quando o app ganha novos recursos, quem já o abriu tem no aparelho uma base no
 * formato anterior. Em vez de apagar tudo e recomeçar, levamos essa base para o
 * formato atual: o que a pessoa criou (publicações, demandas, vendas…) é preservado
 * e apenas o conteúdo NOVO da base demonstrativa é acrescentado.
 *
 * Versão 1 → 2: bairros adicionais (com região), ônibus acessíveis, barreiras e
 * apoios no caminho e recursos de acessibilidade dos locais demonstrativos.
 */

/** Coleções que só existem a partir da versão 2. */
const ADDED_IN_V2: CollectionName[] = ['transitLines', 'transitStops', 'accessPoints']

/** Locais demonstrativos que passaram a informar recursos de acessibilidade. */
const PLACES_WITH_ACCESSIBILITY = ['businesses', 'publicServices', 'events'] as const

/**
 * Devolve a base atualizada, ou `null` quando ela não pode ser aproveitada
 * (vazia, incompleta ou de uma versão desconhecida) — nesse caso gera-se uma nova.
 */
export function upgradeDatabase(
  persisted: Partial<Database> | null,
  now: Date,
  seed: (now: Date) => Database,
): Database | null {
  if (!persisted || typeof persisted.meta !== 'object' || persisted.meta === null) return null
  if (persisted.meta.schemaVersion !== 1) return null
  const inherited = COLLECTION_NAMES.filter((name) => !ADDED_IN_V2.includes(name))
  if (!inherited.every((name) => Array.isArray(persisted[name]))) return null

  const db = persisted as Database
  // Primeiro traz as datas antigas para hoje; o conteúdo novo já nasce com datas atuais.
  for (const name of ADDED_IN_V2) (db as unknown as Record<string, unknown>)[name] = []
  rebaseDatabase(db, now)

  const fresh = seed(now)
  db.transitLines = fresh.transitLines
  db.transitStops = fresh.transitStops
  db.accessPoints = fresh.accessPoints

  for (const neighborhood of fresh.neighborhoods) {
    const existing = db.neighborhoods.find((candidate) => candidate.id === neighborhood.id)
    if (!existing) db.neighborhoods.push(neighborhood)
    else if (existing.zone === undefined && neighborhood.zone !== undefined) {
      existing.zone = neighborhood.zone
    }
  }

  for (const name of PLACES_WITH_ACCESSIBILITY) {
    const current: Array<{ id: string; accessibility?: unknown }> = db[name]
    for (const reference of fresh[name]) {
      const existing = current.find((candidate) => candidate.id === reference.id)
      if (existing && existing.accessibility === undefined) {
        existing.accessibility = reference.accessibility
      }
    }
  }

  db.meta = { ...db.meta, schemaVersion: DATABASE_SCHEMA_VERSION }
  return db
}
