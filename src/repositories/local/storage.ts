import { clear, createStore, entries, set, setMany, type UseStore } from 'idb-keyval'

import type { CollectionName, Database, DatabaseMeta } from '@/types'

/**
 * Adaptadores de persistência do banco local.
 * Cada coleção é gravada em uma chave própria, para que uma alteração regrave
 * apenas as coleções afetadas.
 */
export interface StorageAdapter {
  readonly kind: 'indexeddb' | 'memory'
  /** Carrega tudo o que estiver persistido, ou `null` se ainda não houver dados. */
  load(): Promise<Partial<Database> | null>
  saveMeta(meta: DatabaseMeta): Promise<void>
  saveCollection<K extends CollectionName>(name: K, rows: Database[K]): Promise<void>
  /** Grava várias coleções em UMA transação (tudo ou nada). */
  saveMany(entries: Array<[CollectionName | 'meta', unknown]>): Promise<void>
  /** Grava o banco inteiro de uma vez (carga inicial e restauração). */
  saveAll(db: Database): Promise<void>
  clear(): Promise<void>
}

const IDB_DATABASE_NAME = 'nexa-demo'
const IDB_STORE_NAME = 'collections'

/** Persistência em IndexedDB (suporta volumes bem maiores que o localStorage, inclusive imagens). */
export function createIndexedDbAdapter(): StorageAdapter {
  let store: UseStore | null = null
  const getStore = (): UseStore => {
    store ??= createStore(IDB_DATABASE_NAME, IDB_STORE_NAME)
    return store
  }

  return {
    kind: 'indexeddb',
    async load() {
      const all = await entries<string, unknown>(getStore())
      if (all.length === 0) return null
      return Object.fromEntries(all) as Partial<Database>
    },
    async saveMeta(meta) {
      await set('meta', meta, getStore())
    },
    async saveCollection(name, rows) {
      await set(name, rows, getStore())
    },
    async saveMany(entries) {
      await setMany(entries as Array<[string, unknown]>, getStore())
    },
    async saveAll(db) {
      await setMany(Object.entries(db) as Array<[string, unknown]>, getStore())
    },
    async clear() {
      await clear(getStore())
    },
  }
}

/** Persistência em memória (testes automatizados e navegadores sem IndexedDB). */
export function createMemoryAdapter(initial: Partial<Database> | null = null): StorageAdapter {
  let snapshot: Partial<Database> | null = initial ? structuredClone(initial) : null

  return {
    kind: 'memory',
    async load() {
      return snapshot ? structuredClone(snapshot) : null
    },
    async saveMeta(meta) {
      snapshot = { ...snapshot, meta: structuredClone(meta) }
    },
    async saveCollection(name, rows) {
      snapshot = { ...snapshot, [name]: structuredClone(rows) }
    },
    async saveMany(entries) {
      snapshot = { ...snapshot, ...structuredClone(Object.fromEntries(entries)) }
    },
    async saveAll(db) {
      snapshot = structuredClone(db)
    },
    async clear() {
      snapshot = null
    },
  }
}

/** Indica se o IndexedDB está disponível no ambiente atual. */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/** Escolhe o melhor adaptador disponível para o ambiente. */
export function createDefaultAdapter(): StorageAdapter {
  if (import.meta.env.MODE === 'test' || !isIndexedDbAvailable()) return createMemoryAdapter()
  return createIndexedDbAdapter()
}
