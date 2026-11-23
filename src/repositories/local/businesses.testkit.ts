import type { Database, WeekSchedule } from '@/types'
import { AppError, type AppErrorCode } from '@/utils/errors'
import { offsetPoint } from '@/utils/geo'

import type { BusinessInput } from '../contracts'
import { buildFixtureDatabase, FIXTURE, FIXTURE_CENTER } from './testing/fixture'

/**
 * AUXILIARES DOS TESTES DE COMÉRCIO (estabelecimentos, produtos, vendas e lançamentos).
 * Usados apenas pelos testes automatizados.
 */

/** Segundo estabelecimento, de outro comerciante, para os testes de privacidade. */
export const OTHER = {
  business: 'biz_outro',
  owner: FIXTURE.users.merchantWithoutBusiness,
  product: 'prd_outro',
} as const

/** Base de teste com um segundo estabelecimento (de `OTHER.owner`) e um produto dele. */
export function seedWithSecondBusiness(now: Date): Database {
  const db = buildFixtureDatabase(now)
  const template = db.businesses[0]!
  db.businesses.push({
    ...structuredClone(template),
    id: OTHER.business,
    ownerId: OTHER.owner,
    name: 'Mercearia Vizinha',
    neighborhoodId: FIXTURE.neighborhoods.centro,
    location: offsetPoint(FIXTURE_CENTER, 50, 50),
    tags: [],
  })
  db.products.push({
    ...structuredClone(db.products[0]!),
    id: OTHER.product,
    businessId: OTHER.business,
    name: 'Arroz 5 kg',
  })
  const owner = db.users.find((user) => user.id === OTHER.owner)!
  owner.businessId = OTHER.business
  return db
}

const WEEKDAYS: WeekSchedule = [
  null,
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '12:00' },
]

/** Dados válidos para cadastrar um estabelecimento. */
export function validBusinessInput(overrides: Partial<BusinessInput> = {}): BusinessInput {
  return {
    name: '  Ateliê do Caio  ',
    categoryId: FIXTURE.categories.services,
    description: 'Consertos de roupas e ajustes sob medida.',
    address: 'Rua das Flores, 45 — Centro',
    neighborhoodId: FIXTURE.neighborhoods.centro,
    location: offsetPoint(FIXTURE_CENTER, 100, 100),
    phone: '(31) 99999-0000',
    schedule: structuredClone(WEEKDAYS),
    tags: ['Entrega', ' Aceita Pix ', 'entrega'],
    ...overrides,
  }
}

/** Executa a promessa e devolve o `AppError` lançado (falha o teste se não lançar). */
export async function captureError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof AppError) return error
    throw error
  }
  throw new Error('Era esperado um erro, mas a operação foi concluída.')
}

/** Atalho: verifica o código do `AppError` lançado. */
export async function expectCode(promise: Promise<unknown>, code: AppErrorCode): Promise<AppError> {
  const error = await captureError(promise)
  if (error.code !== code) {
    throw new Error(`Esperado erro "${code}", recebido "${error.code}": ${error.message}`)
  }
  return error
}
