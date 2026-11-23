import { config } from '@/config'
import {
  COLLECTION_NAMES,
  DATABASE_SCHEMA_VERSION,
  type CollectionName,
  type Database,
} from '@/types'
import { now as appNow } from '@/utils/clock'
import { AppError } from '@/utils/errors'

import { rebaseDatabase } from './rebase'
import { createMemoryAdapter, type StorageAdapter } from './storage'

/**
 * NÚCLEO DO BANCO LOCAL (modo demonstração)
 * ─────────────────────────────────────────────────────────────────────────────
 * Mantém o banco em memória (leituras síncronas e rápidas) e grava em segundo
 * plano no adaptador de persistência (IndexedDB no navegador).
 *
 * Regras de uso pelos repositórios:
 *  • `read(fn)`  — consulta. O resultado é devolvido como CÓPIA independente.
 *  • `write(collections, fn)` — alteração TRANSACIONAL: se `fn` lançar um erro,
 *    as coleções indicadas voltam ao estado anterior e nada é persistido.
 *    O resultado também é devolvido como cópia.
 *  • Dentro de `fn` o banco pode ser lido e modificado livremente, mas apenas as
 *    coleções declaradas em `collections` são persistidas/restauradas.
 */

export type ChangeListener = (changed: ReadonlyArray<CollectionName>) => void
export type PersistErrorListener = (error: unknown) => void
export type SeedFactory = (now: Date) => Database

export interface LocalStoreOptions {
  adapter: StorageAdapter
  seed: SeedFactory
  /** Relógio usado para gerar a carga inicial. Padrão: relógio da aplicação. */
  now?: () => Date
}

/** Verificação estrita das coleções declaradas em `write` (apenas em testes automatizados). */
const STRICT_WRITES = import.meta.env.MODE === 'test'

function isCompleteDatabase(value: Partial<Database> | null): value is Database {
  if (!value || typeof value.meta !== 'object' || value.meta === null) return false
  if (value.meta.schemaVersion !== DATABASE_SCHEMA_VERSION) return false
  return COLLECTION_NAMES.every((name) => Array.isArray(value[name]))
}

export class LocalStore {
  private db: Database | null = null
  private initPromise: Promise<void> | null = null
  private readonly listeners = new Set<ChangeListener>()
  private readonly persistErrorListeners = new Set<PersistErrorListener>()
  private readonly dirty = new Set<CollectionName | 'meta'>()
  private flushPromise: Promise<void> | null = null
  private writing = false
  private readonly adapter: StorageAdapter
  private readonly seed: SeedFactory
  private readonly now: () => Date

  constructor(options: LocalStoreOptions) {
    this.adapter = options.adapter
    this.seed = options.seed
    this.now = options.now ?? appNow
  }

  /** Tipo de armazenamento em uso neste dispositivo. */
  get storageKind(): StorageAdapter['kind'] {
    return this.adapter.kind
  }

  get isReady(): boolean {
    return this.db !== null
  }

  /**
   * Carrega os dados persistidos ou gera a base demonstrativa inicial.
   * Pode ser chamado várias vezes: a inicialização acontece uma única vez.
   */
  init(): Promise<void> {
    this.initPromise ??= this.load()
    return this.initPromise
  }

  private async load(): Promise<void> {
    let persisted: Partial<Database> | null = null
    try {
      persisted = await this.adapter.load()
    } catch (error) {
      // Armazenamento indisponível (ex.: navegação privada): segue apenas em memória.
      this.emitPersistError(error)
    }

    if (isCompleteDatabase(persisted)) {
      this.db = persisted
      // Mantém a base demonstrativa "em dia": em um novo dia, todas as datas avançam juntas.
      if (rebaseDatabase(persisted, this.now())) await this.persistAll()
      return
    }

    // Sem dados, versão antiga do esquema ou dados incompletos: gera nova base demonstrativa.
    this.db = this.seed(this.now())
    await this.persistAll()
  }

  private requireDb(): Database {
    if (!this.db) {
      throw new AppError(
        'unavailable',
        'Os dados do NEXA ainda estão sendo carregados. Tente novamente em instantes.',
      )
    }
    return this.db
  }

  /** Consulta o banco. O resultado é uma cópia independente (seguro para a interface). */
  read<T>(selector: (db: Database) => T): T {
    return structuredClone(selector(this.requireDb()))
  }

  /**
   * Executa uma alteração transacional nas coleções indicadas.
   * Em caso de erro, as coleções são restauradas e o erro é propagado.
   */
  write<T>(collections: CollectionName[], mutator: (db: Database) => T): T {
    const db = this.requireDb()
    if (this.writing) {
      throw new AppError('unknown', 'Operação de escrita aninhada não é permitida.')
    }

    const touched = [...new Set(collections)]
    const backup = new Map<CollectionName, unknown>()
    for (const name of touched) backup.set(name, structuredClone(db[name]))
    const metaBackup = structuredClone(db.meta)

    // Em testes, detecta alterações em coleções NÃO declaradas (que não seriam persistidas).
    const undeclared = STRICT_WRITES
      ? COLLECTION_NAMES.filter((name) => !touched.includes(name)).map(
          (name) => [name, JSON.stringify(db[name])] as const,
        )
      : []

    this.writing = true
    let result: T
    try {
      result = structuredClone(mutator(db))
      for (const [name, before] of undeclared) {
        if (JSON.stringify(db[name]) !== before) {
          ;(db as unknown as Record<string, unknown>)[name] = JSON.parse(before)
          throw new AppError(
            'unknown',
            `write(): a coleção "${name}" foi alterada sem ter sido declarada.`,
          )
        }
      }
    } catch (error) {
      for (const [name, rows] of backup) {
        ;(db as unknown as Record<string, unknown>)[name] = rows
      }
      db.meta = metaBackup
      throw error
    } finally {
      this.writing = false
    }

    // Só persiste e notifica o que REALMENTE mudou. Uma "gravação" sem alterações não pode
    // disparar a revalidação das telas (isso criaria um ciclo: revalidar → ler → "gravar" → …).
    const changed = touched.filter(
      (name) => JSON.stringify(db[name]) !== JSON.stringify(backup.get(name)),
    )
    const metaChanged = JSON.stringify(db.meta) !== JSON.stringify(metaBackup)
    if (changed.length === 0 && !metaChanged) return result

    for (const name of changed) this.dirty.add(name)
    if (metaChanged) this.dirty.add('meta')
    this.scheduleFlush()
    if (changed.length > 0) this.emitChange(changed)
    return result
  }

  /** Restaura a base demonstrativa para o estado inicial (datas recalculadas a partir de agora). */
  async reset(): Promise<void> {
    await this.init()
    await this.whenIdle()
    this.db = this.seed(this.now())
    try {
      await this.adapter.clear()
    } catch (error) {
      this.emitPersistError(error)
    }
    await this.persistAll()
    this.emitChange(COLLECTION_NAMES)
  }

  /** Assina alterações de dados. Devolve a função para cancelar a assinatura. */
  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Assina falhas de gravação no dispositivo (ex.: armazenamento cheio). */
  onPersistError(listener: PersistErrorListener): () => void {
    this.persistErrorListeners.add(listener)
    return () => {
      this.persistErrorListeners.delete(listener)
    }
  }

  /** Aguarda o término das gravações pendentes (útil em testes e antes de recarregar a página). */
  async whenIdle(): Promise<void> {
    while (this.flushPromise) {
      await this.flushPromise
    }
  }

  private emitChange(changed: ReadonlyArray<CollectionName>): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(changed)
      } catch (error) {
        console.error('[NEXA] Falha em um assinante de alterações de dados.', error)
      }
    }
  }

  private emitPersistError(error: unknown): void {
    console.warn('[NEXA] Não foi possível gravar os dados neste dispositivo.', error)
    for (const listener of [...this.persistErrorListeners]) listener(error)
  }

  private scheduleFlush(): void {
    if (this.flushPromise) return
    this.flushPromise = Promise.resolve()
      .then(() => this.flush())
      .finally(() => {
        this.flushPromise = null
        if (this.dirty.size > 0) this.scheduleFlush()
      })
  }

  private async flush(): Promise<void> {
    const db = this.db
    if (!db) return
    const names = [...this.dirty]
    this.dirty.clear()
    try {
      // Uma única transação: ou todas as coleções alteradas são gravadas, ou nenhuma.
      await this.adapter.saveMany(names.map((name) => [name, name === 'meta' ? db.meta : db[name]]))
    } catch (error) {
      this.emitPersistError(error)
    }
  }

  private async persistAll(): Promise<void> {
    const db = this.db
    if (!db) return
    this.dirty.clear()
    try {
      await this.adapter.saveAll(db)
    } catch (error) {
      this.emitPersistError(error)
    }
  }
}

/**
 * Simula a latência de rede dos repositórios locais, para que a interface exiba
 * estados de carregamento realistas. Em testes automatizados a latência é zero.
 */
export function simulateLatency(factor = 1): Promise<void> {
  const base = config.demoLatencyMs * factor
  if (base <= 0) return Promise.resolve()
  const jitter = base * (0.7 + Math.random() * 0.6)
  return new Promise((resolve) => setTimeout(resolve, jitter))
}

/** Cria um banco isolado em memória — usado nos testes automatizados. */
export function createTestStore(seed: SeedFactory, now?: () => Date): LocalStore {
  return new LocalStore({ adapter: createMemoryAdapter(), seed, now })
}
