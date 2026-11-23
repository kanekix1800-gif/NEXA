import { buildSeedDatabase } from '@/data/seed'

import type { Repositories } from './contracts'
import { createLocalRepositories } from './local'
import { createDefaultAdapter } from './local/storage'
import { LocalStore } from './local/store'

/**
 * PONTO ÚNICO DE ACESSO AOS DADOS
 * ─────────────────────────────────────────────────────────────────────────────
 * A interface importa `repos` daqui e conhece apenas os contratos
 * (`./contracts`). Para migrar para o Supabase, basta criar a implementação
 * correspondente e selecioná-la neste arquivo conforme `config.dataSource`.
 */

const store = new LocalStore({
  adapter: createDefaultAdapter(),
  seed: buildSeedDatabase,
})

export const repos: Repositories = createLocalRepositories(store)

/** Carrega os dados persistidos (ou gera a base demonstrativa). Chamar antes de renderizar o app. */
export function initRepositories(): Promise<void> {
  return store.init()
}

/**
 * Assina qualquer alteração de dados (usado para revalidar as consultas da interface).
 * Devolve a função para cancelar a assinatura.
 */
export function subscribeToDataChanges(listener: () => void): () => void {
  return store.subscribe(() => listener())
}

/** Assina falhas de gravação no dispositivo (ex.: armazenamento cheio ou indisponível). */
export function subscribeToPersistErrors(listener: (error: unknown) => void): () => void {
  return store.onPersistError(listener)
}

/** Aguarda as gravações pendentes no dispositivo. */
export function flushPendingWrites(): Promise<void> {
  return store.whenIdle()
}

export type * from './contracts'
