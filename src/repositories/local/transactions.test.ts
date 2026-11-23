import { describe, expect, it } from 'vitest'

import type { TransactionInput } from '../contracts'
import { expectCode, OTHER, seedWithSecondBusiness } from './businesses.testkit'
import { createTestHarness } from './testing/harness'
import { FIXTURE, FIXTURE_NOW } from './testing/fixture'

const HOUR = 60 * 60 * 1000
const fromNow = (hours: number) => new Date(FIXTURE_NOW.getTime() + hours * HOUR).toISOString()

async function merchantHarness() {
  const t = await createTestHarness({ seed: seedWithSecondBusiness })
  t.signInAs(FIXTURE.users.merchant)
  return t
}

function expenseInput(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: 'expense',
    category: 'suppliers',
    description: '  Compra de farinha  ',
    amountCents: 15_000,
    date: fromNow(-24),
    ...overrides,
  }
}

describe('lançamentos financeiros (NEXA Business)', () => {
  it('registra lançamento com dados normalizados', async () => {
    const t = await merchantHarness()
    const entry = await t.repos.transactions.create(FIXTURE.business, expenseInput())
    expect(entry).toMatchObject({
      businessId: FIXTURE.business,
      type: 'expense',
      category: 'suppliers',
      description: 'Compra de farinha',
      amountCents: 15_000,
      date: fromNow(-24),
      createdBy: FIXTURE.users.merchant,
    })
    expect(entry.saleId).toBeUndefined()
  })

  it('valida categoria compatível com o tipo, valor, descrição e data', async () => {
    const t = await merchantHarness()
    const cases: Array<[Partial<TransactionInput>, string]> = [
      [{ category: 'sales' }, 'category'],
      [{ type: 'income', category: 'rent' }, 'category'],
      [{ amountCents: 0 }, 'amountCents'],
      [{ amountCents: 10.5 }, 'amountCents'],
      [{ description: 'x' }, 'description'],
      [{ description: 'x'.repeat(121) }, 'description'],
      [{ date: 'ontem' }, 'date'],
      [{ date: fromNow(25) }, 'date'],
    ]
    for (const [overrides, field] of cases) {
      const error = await expectCode(
        t.repos.transactions.create(FIXTURE.business, expenseInput(overrides)),
        'validation',
      )
      expect(error.fieldErrors, field).toHaveProperty(field)
    }
    // Até 1 dia no futuro é aceito (ex.: conta que vence amanhã).
    const tomorrow = await t.repos.transactions.create(
      FIXTURE.business,
      expenseInput({ date: fromNow(20), category: 'utilities' }),
    )
    expect(tomorrow.category).toBe('utilities')
  })

  it('lista os mais recentes primeiro, com filtros de tipo, categoria e período', async () => {
    const t = await merchantHarness()
    const rent = await t.repos.transactions.create(
      FIXTURE.business,
      expenseInput({ category: 'rent', description: 'Aluguel', date: fromNow(-240) }),
    )
    const flour = await t.repos.transactions.create(FIXTURE.business, expenseInput())
    const services = await t.repos.transactions.create(FIXTURE.business, {
      type: 'income',
      category: 'services',
      description: 'Encomenda de festa',
      amountCents: 40_000,
      date: fromNow(-2),
    })

    const ids = async (filters?: Parameters<typeof t.repos.transactions.list>[1]) =>
      (await t.repos.transactions.list(FIXTURE.business, filters)).map((entry) => entry.id)

    expect(await ids()).toEqual([services.id, flour.id, rent.id])
    expect(await ids({ type: 'expense' })).toEqual([flour.id, rent.id])
    expect(await ids({ category: 'rent' })).toEqual([rent.id])
    expect(await ids({ range: { from: fromNow(-48), to: fromNow(0) } })).toEqual([
      services.id,
      flour.id,
    ])
  })

  it('remove lançamentos manuais', async () => {
    const t = await merchantHarness()
    const entry = await t.repos.transactions.create(FIXTURE.business, expenseInput())
    await t.repos.transactions.remove(entry.id)
    expect(t.snapshot().transactions).toEqual([])
    await expectCode(t.repos.transactions.remove(entry.id), 'not_found')
  })

  it('privacidade: outro comerciante, morador e administração não acessam os lançamentos', async () => {
    const t = await merchantHarness()
    const entry = await t.repos.transactions.create(FIXTURE.business, expenseInput())

    for (const userId of [OTHER.owner, FIXTURE.users.resident, FIXTURE.users.admin]) {
      t.signInAs(userId)
      await expectCode(t.repos.transactions.list(FIXTURE.business), 'forbidden')
      await expectCode(t.repos.transactions.create(FIXTURE.business, expenseInput()), 'forbidden')
      await expectCode(t.repos.transactions.remove(entry.id), 'forbidden')
    }
    t.signOut()
    await expectCode(t.repos.transactions.list(FIXTURE.business), 'unauthenticated')
    expect(t.snapshot().transactions).toHaveLength(1)
  })
})
