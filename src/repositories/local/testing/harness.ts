import type { Database, ID } from '@/types'
import { setClock } from '@/utils/clock'

import type { Repositories } from '../../contracts'
import { createLocalRepositories } from '../index'
import { clearSession, writeSession } from '../session'
import { createMemoryAdapter } from '../storage'
import { LocalStore, type SeedFactory } from '../store'
import { buildFixtureDatabase, FIXTURE_NOW } from './fixture'

/**
 * AMBIENTE DE TESTE DOS REPOSITÓRIOS LOCAIS
 * ─────────────────────────────────────────────────────────────────────────────
 * Cria um conjunto ISOLADO de repositórios (banco em memória + relógio fixo).
 *
 *   const t = await createTestHarness()
 *   t.signInAs(FIXTURE.users.merchant)
 *   const sale = await t.repos.sales.register(FIXTURE.business, { ... })
 *   expect(t.snapshot().products.find(...)?.stock).toBe(48)
 *
 * O relógio da aplicação é restaurado e a sessão é limpa automaticamente ao final
 * de cada teste (ver `src/test/setup.ts`).
 */
export interface TestHarness {
  repos: Repositories
  store: LocalStore
  /** Inicia a sessão como o usuário indicado (sem senha). */
  signInAs(userId: ID): void
  signOut(): void
  /** Altera o "agora" da aplicação. */
  setNow(date: Date): void
  /** Cópia do banco inteiro, para asserções. */
  snapshot(): Database
}

export interface TestHarnessOptions {
  /** "Agora" inicial. Padrão: `FIXTURE_NOW` (meio-dia de uma quarta-feira). */
  now?: Date
  /** Gerador do banco inicial. Padrão: `buildFixtureDatabase`. */
  seed?: SeedFactory
}

export async function createTestHarness(options: TestHarnessOptions = {}): Promise<TestHarness> {
  const initialNow = options.now ?? FIXTURE_NOW
  setClock(initialNow)
  clearSession()

  const store = new LocalStore({
    adapter: createMemoryAdapter(),
    seed: options.seed ?? buildFixtureDatabase,
  })
  await store.init()
  const repos = createLocalRepositories(store)

  return {
    repos,
    store,
    signInAs(userId) {
      writeSession({ userId, startedAt: initialNow.toISOString() })
    },
    signOut() {
      clearSession()
    },
    setNow(date) {
      setClock(date)
    },
    snapshot() {
      return store.read((db) => db)
    },
  }
}
