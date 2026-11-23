import { describe, expect, it, vi } from 'vitest'

import { buildDemoCredentials } from '@/data/demoCredentials'
import { DATABASE_SCHEMA_VERSION, type Database, type Neighborhood } from '@/types'
import { AppError } from '@/utils/errors'

import { createMemoryAdapter } from './storage'
import { LocalStore } from './store'

function emptyDatabase(now: Date): Database {
  const seededAt = now.toISOString()
  return {
    meta: {
      schemaVersion: DATABASE_SCHEMA_VERSION,
      seededAt,
      rebasedAt: seededAt,
      demandSequence: 0,
    },
    neighborhoods: [{ id: 'nb_centro', name: 'Centro', center: { lat: -19.93, lng: -43.93 } }],
    users: [],
    credentials: buildDemoCredentials(seededAt),
    passwordResets: [],
    userSettings: [],
    categories: [],
    posts: [],
    comments: [],
    reports: [],
    demands: [],
    businesses: [],
    reviews: [],
    favorites: [],
    products: [],
    sales: [],
    transactions: [],
    institutions: [],
    initiatives: [],
    publicServices: [],
    events: [],
    notifications: [],
    news: [],
    aiConversations: [],
    transitLines: [],
    transitStops: [],
    accessPoints: [],
  }
}

const vila: Neighborhood = {
  id: 'nb_vila',
  name: 'Vila Esperança',
  center: { lat: -19.94, lng: -43.94 },
}

describe('banco local', () => {
  it('gera a base demonstrativa na primeira inicialização e a persiste', async () => {
    const adapter = createMemoryAdapter()
    const store = new LocalStore({ adapter, seed: emptyDatabase })
    expect(store.isReady).toBe(false)
    await store.init()
    expect(store.isReady).toBe(true)
    expect(store.read((db) => db.neighborhoods)).toHaveLength(1)
    const persisted = await adapter.load()
    expect(persisted?.neighborhoods).toHaveLength(1)
  })

  it('recarrega os dados persistidos em vez de gerar a base novamente', async () => {
    const adapter = createMemoryAdapter()
    const first = new LocalStore({ adapter, seed: emptyDatabase })
    await first.init()
    first.write(['neighborhoods'], (db) => {
      db.neighborhoods.push(vila)
    })
    await first.whenIdle()

    const seed = vi.fn(emptyDatabase)
    const second = new LocalStore({ adapter, seed })
    await second.init()
    expect(seed).not.toHaveBeenCalled()
    expect(second.read((db) => db.neighborhoods.map((n) => n.id))).toEqual(['nb_centro', 'nb_vila'])
  })

  it('atualiza a base da versão anterior sem apagar o que existia', async () => {
    const previous: Partial<Database> = emptyDatabase(new Date())
    previous.meta!.schemaVersion = 1
    previous.neighborhoods!.push(vila)
    // A versão 1 ainda não tinha as coleções de mobilidade.
    delete previous.transitLines
    delete previous.transitStops
    delete previous.accessPoints
    const adapter = createMemoryAdapter(previous)
    const store = new LocalStore({ adapter, seed: emptyDatabase })
    await store.init()

    expect(store.read((db) => db.neighborhoods.map((nb) => nb.id))).toEqual(['nb_centro', vila.id])
    expect(store.read((db) => db.meta.schemaVersion)).toBe(DATABASE_SCHEMA_VERSION)
    expect(store.read((db) => db.transitLines)).toEqual([])
    // A base atualizada é gravada no aparelho.
    expect((await adapter.load())?.meta?.schemaVersion).toBe(DATABASE_SCHEMA_VERSION)
  })

  it('descarta dados de uma versão desconhecida do esquema', async () => {
    const unknown = emptyDatabase(new Date())
    unknown.meta.schemaVersion = DATABASE_SCHEMA_VERSION + 5
    unknown.neighborhoods.push(vila)
    const store = new LocalStore({ adapter: createMemoryAdapter(unknown), seed: emptyDatabase })
    await store.init()
    expect(store.read((db) => db.neighborhoods)).toHaveLength(1)
  })

  it('devolve cópias: alterar o resultado não altera o banco', async () => {
    const store = new LocalStore({ adapter: createMemoryAdapter(), seed: emptyDatabase })
    await store.init()
    const rows = store.read((db) => db.neighborhoods)
    rows[0]!.name = 'Alterado fora do banco'
    rows.push(vila)
    expect(store.read((db) => db.neighborhoods)).toEqual([
      { id: 'nb_centro', name: 'Centro', center: { lat: -19.93, lng: -43.93 } },
    ])
  })

  it('desfaz toda a alteração quando ocorre um erro (transação)', async () => {
    const store = new LocalStore({ adapter: createMemoryAdapter(), seed: emptyDatabase })
    await store.init()
    const listener = vi.fn()
    store.subscribe(listener)

    expect(() =>
      store.write(['neighborhoods'], (db) => {
        db.neighborhoods.push(vila)
        db.meta.demandSequence = 99
        throw new AppError('conflict', 'Regra de negócio violada.')
      }),
    ).toThrow('Regra de negócio violada.')

    expect(store.read((db) => db.neighborhoods)).toHaveLength(1)
    expect(store.read((db) => db.meta.demandSequence)).toBe(0)
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifica os assinantes e grava apenas após alterações concluídas', async () => {
    const adapter = createMemoryAdapter()
    const store = new LocalStore({ adapter, seed: emptyDatabase })
    await store.init()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.write(['neighborhoods'], (db) => {
      db.neighborhoods.push(vila)
    })
    expect(listener).toHaveBeenCalledWith(['neighborhoods'])
    await store.whenIdle()
    expect((await adapter.load())?.neighborhoods).toHaveLength(2)

    unsubscribe()
    store.write(['neighborhoods'], (db) => {
      db.neighborhoods.pop()
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('não notifica nem grava quando a "alteração" não muda nada', async () => {
    const adapter = createMemoryAdapter()
    const saveMany = vi.spyOn(adapter, 'saveMany')
    const store = new LocalStore({ adapter, seed: emptyDatabase })
    await store.init()
    const listener = vi.fn()
    store.subscribe(listener)

    const result = store.write(['neighborhoods'], (db) => db.neighborhoods.length)
    await store.whenIdle()

    expect(result).toBe(1)
    expect(listener).not.toHaveBeenCalled()
    expect(saveMany).not.toHaveBeenCalled()
  })

  it('restaura a base demonstrativa com a data atual', async () => {
    let current = new Date('2026-11-22T12:00:00.000Z')
    const store = new LocalStore({
      adapter: createMemoryAdapter(),
      seed: emptyDatabase,
      now: () => current,
    })
    await store.init()
    store.write(['neighborhoods'], (db) => {
      db.neighborhoods.push(vila)
    })

    current = new Date('2026-12-01T09:00:00.000Z')
    await store.reset()
    expect(store.read((db) => db.neighborhoods)).toHaveLength(1)
    expect(store.read((db) => db.meta.seededAt)).toBe('2026-12-01T09:00:00.000Z')
  })

  it('continua funcionando em memória quando o dispositivo não consegue gravar', async () => {
    const failing = createMemoryAdapter()
    failing.saveAll = () => Promise.reject(new Error('quota'))
    failing.saveCollection = () => Promise.reject(new Error('quota'))
    failing.saveMeta = () => Promise.reject(new Error('quota'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = new LocalStore({ adapter: failing, seed: emptyDatabase })
    const onError = vi.fn()
    store.onPersistError(onError)
    await store.init()
    store.write(['neighborhoods'], (db) => {
      db.neighborhoods.push(vila)
    })
    await store.whenIdle()

    expect(store.read((db) => db.neighborhoods)).toHaveLength(2)
    expect(onError).toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
  })

  it('exige inicialização antes do uso', () => {
    const store = new LocalStore({ adapter: createMemoryAdapter(), seed: emptyDatabase })
    expect(() => store.read((db) => db.users)).toThrow(/sendo carregados/)
  })
})
