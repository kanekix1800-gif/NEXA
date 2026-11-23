import { DATABASE_SCHEMA_VERSION, type Database } from '@/types'

import { buildDemoCredentials } from './demoCredentials'
import { buildCommunity } from './seed/community'
import { createSeedContext } from './seed/context'
import { buildCore } from './seed/core'

/**
 * BASE DEMONSTRATIVA DO NEXA
 * ─────────────────────────────────────────────────────────────────────────────
 * Gera o banco inicial do modo demonstração a partir do elenco fixo
 * (`seed/cast.ts`). Todas as datas são calculadas a partir de `now`, para que a
 * demonstração esteja sempre "atual" — inclusive após restaurar os dados.
 *
 * Todo o conteúdo é FICTÍCIO: pessoas, estabelecimentos, ocorrências e notícias
 * existem apenas para demonstrar o produto.
 */
export function buildSeedDatabase(now: Date): Database {
  const ctx = createSeedContext(now)
  const core = buildCore(ctx)
  const { demandSequence, ...community } = buildCommunity(ctx)
  const seededAt = now.toISOString()

  return {
    meta: { schemaVersion: DATABASE_SCHEMA_VERSION, seededAt, rebasedAt: seededAt, demandSequence },
    ...core,
    ...community,
    credentials: buildDemoCredentials(seededAt),
    passwordResets: [],
    aiConversations: [],
  }
}
