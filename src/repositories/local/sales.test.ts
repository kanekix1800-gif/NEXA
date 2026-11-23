import { describe, expect, it } from 'vitest'

import { paths } from '@/app/paths'
import type { StockShortage } from '@/services/business/sales'

import type { RegisterSaleInput } from '../contracts'
import { expectCode, OTHER, seedWithSecondBusiness } from './businesses.testkit'
import { createTestHarness } from './testing/harness'
import { FIXTURE, FIXTURE_NOW } from './testing/fixture'

const { bread, cake, coffee, inactive } = FIXTURE.products

async function merchantHarness() {
  const t = await createTestHarness({ seed: seedWithSecondBusiness })
  t.signInAs(FIXTURE.users.merchant)
  const stockOf = (id: string) => t.snapshot().products.find((product) => product.id === id)?.stock
  return { t, stockOf }
}

function saleInput(
  items: RegisterSaleInput['items'],
  extra: Partial<RegisterSaleInput> = {},
): RegisterSaleInput {
  return { items, paymentMethod: 'pix', ...extra }
}

describe('vendas (NEXA Business)', () => {
  it('registra a venda e baixa o estoque', async () => {
    const { t, stockOf } = await merchantHarness()
    const sale = await t.repos.sales.register(
      FIXTURE.business,
      saleInput([{ productId: bread, quantity: 3 }]),
    )

    expect(stockOf(bread)).toBe(47)
    expect(sale).toMatchObject({
      businessId: FIXTURE.business,
      subtotalCents: 300,
      discountCents: 0,
      totalCents: 300,
      paymentMethod: 'pix',
      createdBy: FIXTURE.users.merchant,
      soldAt: FIXTURE_NOW.toISOString(),
    })
    expect(sale.items).toEqual([
      {
        productId: bread,
        productName: 'Pão francês',
        quantity: 3,
        unitPriceCents: 100,
        subtotalCents: 300,
      },
    ])
    expect(t.snapshot().sales).toHaveLength(1)
  })

  it('bloqueia venda acima do estoque e não grava NADA', async () => {
    const { t } = await merchantHarness()
    const before = t.snapshot()

    const error = await expectCode(
      t.repos.sales.register(
        FIXTURE.business,
        saleInput([
          { productId: bread, quantity: 5 },
          { productId: cake, quantity: 3 },
        ]),
      ),
      'insufficient_stock',
    )
    expect(error.message).toContain('Bolo de cenoura')
    expect(error.details as StockShortage[]).toEqual([
      { productId: cake, name: 'Bolo de cenoura', requested: 3, available: 2 },
    ])

    const after = t.snapshot()
    expect(after.products).toEqual(before.products)
    expect(after.sales).toEqual([])
    expect(after.transactions).toEqual([])
    expect(after.notifications).toEqual(before.notifications)
  })

  it('permite vender acima do estoque quando o estabelecimento autoriza estoque negativo', async () => {
    const { t, stockOf } = await merchantHarness()
    await t.repos.businesses.update(FIXTURE.business, { settings: { allowNegativeStock: true } })

    const sale = await t.repos.sales.register(
      FIXTURE.business,
      saleInput([{ productId: cake, quantity: 3 }]),
    )
    expect(sale.totalCents).toBe(7500)
    expect(stockOf(cake)).toBe(-1)
  })

  it('soma itens repetidos em uma única linha', async () => {
    const { t, stockOf } = await merchantHarness()
    const sale = await t.repos.sales.register(
      FIXTURE.business,
      saleInput([
        { productId: bread, quantity: 2 },
        { productId: coffee, quantity: 1 },
        { productId: bread, quantity: 3 },
      ]),
    )
    expect(sale.items.map((item) => [item.productId, item.quantity])).toEqual([
      [bread, 5],
      [coffee, 1],
    ])
    expect(sale.subtotalCents).toBe(5 * 100 + 500)
    expect(stockOf(bread)).toBe(45)
  })

  it('não baixa estoque de produto sem controle de estoque', async () => {
    const { t, stockOf } = await merchantHarness()
    const sale = await t.repos.sales.register(
      FIXTURE.business,
      saleInput([{ productId: coffee, quantity: 10 }]),
    )
    expect(sale.totalCents).toBe(5000)
    expect(stockOf(coffee)).toBe(0)
  })

  it('aplica o desconto ao total e recusa desconto maior que o subtotal', async () => {
    const { t } = await merchantHarness()
    const items = [
      { productId: bread, quantity: 10 },
      { productId: cake, quantity: 1 },
    ]
    const sale = await t.repos.sales.register(
      FIXTURE.business,
      saleInput(items, { discountCents: 500, paymentMethod: 'cash' }),
    )
    expect(sale).toMatchObject({ subtotalCents: 3500, discountCents: 500, totalCents: 3000 })

    const error = await expectCode(
      t.repos.sales.register(FIXTURE.business, saleInput(items, { discountCents: 99_999 })),
      'validation',
    )
    expect(error.fieldErrors).toHaveProperty('discountCents')
    expect(t.snapshot().sales).toHaveLength(1)
  })

  it('cria o lançamento de receita vinculado à venda, que não pode ser removido', async () => {
    const { t } = await merchantHarness()
    const soldAt = new Date(FIXTURE_NOW.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const sale = await t.repos.sales.register(
      FIXTURE.business,
      saleInput(
        [
          { productId: bread, quantity: 4 },
          { productId: coffee, quantity: 1 },
        ],
        { soldAt, note: '  Cliente da manhã  ' },
      ),
    )
    expect(sale.note).toBe('Cliente da manhã')

    const transactions = await t.repos.transactions.list(FIXTURE.business)
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      type: 'income',
      category: 'sales',
      description: 'Venda — 2 itens',
      amountCents: sale.totalCents,
      date: soldAt,
      saleId: sale.id,
      createdBy: FIXTURE.users.merchant,
    })

    const error = await expectCode(t.repos.transactions.remove(transactions[0]!.id), 'conflict')
    expect(error.message).toBe('Lançamentos gerados por vendas não podem ser removidos.')
    expect(t.snapshot().transactions).toHaveLength(1)
  })

  it('notifica o proprietário quando um produto cruza o estoque mínimo', async () => {
    const { t } = await merchantHarness()
    const lowStockNotifications = () =>
      t.snapshot().notifications.filter((entry) => entry.title === 'Estoque baixo')

    // 50 → 11: ainda acima do mínimo (10).
    await t.repos.sales.register(FIXTURE.business, saleInput([{ productId: bread, quantity: 39 }]))
    expect(lowStockNotifications()).toHaveLength(0)

    // 11 → 10: cruza o mínimo.
    await t.repos.sales.register(FIXTURE.business, saleInput([{ productId: bread, quantity: 1 }]))
    expect(lowStockNotifications()).toEqual([
      expect.objectContaining({
        userId: FIXTURE.users.merchant,
        category: 'commerce',
        body: 'Pão francês: restam 10 un',
        link: paths.businessProducts,
        read: false,
      }),
    ])

    // Já abaixo do mínimo (10 → 9) e bolo já no mínimo (2 → 1): sem novos alertas.
    await t.repos.sales.register(
      FIXTURE.business,
      saleInput([
        { productId: bread, quantity: 1 },
        { productId: cake, quantity: 1 },
      ]),
    )
    expect(lowStockNotifications()).toHaveLength(1)
  })

  it('valida itens, quantidades, forma de pagamento e data', async () => {
    const { t } = await merchantHarness()
    const cases: Array<[RegisterSaleInput, string]> = [
      [saleInput([]), 'items'],
      [saleInput([{ productId: inactive, quantity: 1 }]), 'items'],
      [saleInput([{ productId: OTHER.product, quantity: 1 }]), 'items'],
      [saleInput([{ productId: 'prd_inexistente', quantity: 1 }]), 'items'],
      [saleInput([{ productId: bread, quantity: 0 }]), 'items'],
      [saleInput([{ productId: bread, quantity: 1.5 }]), 'items'],
      [
        saleInput([{ productId: bread, quantity: 1 }], {
          paymentMethod: 'cheque' as unknown as RegisterSaleInput['paymentMethod'],
        }),
        'paymentMethod',
      ],
      [
        saleInput([{ productId: bread, quantity: 1 }], {
          soldAt: new Date(FIXTURE_NOW.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        }),
        'soldAt',
      ],
      [saleInput([{ productId: bread, quantity: 1 }], { note: 'x'.repeat(201) }), 'note'],
    ]
    for (const [input, field] of cases) {
      const error = await expectCode(t.repos.sales.register(FIXTURE.business, input), 'validation')
      expect(error.fieldErrors, field).toHaveProperty(field)
    }
    expect(t.snapshot().sales).toEqual([])
    expect(t.snapshot().products.find((product) => product.id === bread)?.stock).toBe(50)
  })

  it('lista as vendas mais recentes primeiro e filtra por período', async () => {
    const { t } = await merchantHarness()
    const hoursAgo = (hours: number) =>
      new Date(FIXTURE_NOW.getTime() - hours * 60 * 60 * 1000).toISOString()
    const older = await t.repos.sales.register(
      FIXTURE.business,
      saleInput([{ productId: bread, quantity: 1 }], { soldAt: hoursAgo(72) }),
    )
    const newer = await t.repos.sales.register(
      FIXTURE.business,
      saleInput([{ productId: bread, quantity: 2 }], { soldAt: hoursAgo(1) }),
    )

    expect((await t.repos.sales.list(FIXTURE.business)).map((sale) => sale.id)).toEqual([
      newer.id,
      older.id,
    ])
    const lastDay = await t.repos.sales.list(FIXTURE.business, {
      range: { from: hoursAgo(24), to: FIXTURE_NOW.toISOString() },
    })
    expect(lastDay.map((sale) => sale.id)).toEqual([newer.id])
    expect(await t.repos.sales.get(older.id)).toMatchObject({ id: older.id, totalCents: 100 })
    expect(await t.repos.sales.get('sal_inexistente')).toBeNull()
  })

  it('privacidade: somente o proprietário acessa as vendas', async () => {
    const { t } = await merchantHarness()
    const sale = await t.repos.sales.register(
      FIXTURE.business,
      saleInput([{ productId: bread, quantity: 1 }]),
    )
    const input = saleInput([{ productId: bread, quantity: 1 }])

    for (const userId of [OTHER.owner, FIXTURE.users.resident, FIXTURE.users.admin]) {
      t.signInAs(userId)
      await expectCode(t.repos.sales.list(FIXTURE.business), 'forbidden')
      await expectCode(t.repos.sales.get(sale.id), 'forbidden')
      await expectCode(t.repos.sales.register(FIXTURE.business, input), 'forbidden')
    }
    t.signOut()
    await expectCode(t.repos.sales.list(FIXTURE.business), 'unauthenticated')

    // O outro comerciante acessa normalmente o próprio negócio.
    t.signInAs(OTHER.owner)
    expect(await t.repos.sales.list(OTHER.business)).toEqual([])
    expect(t.snapshot().sales).toHaveLength(1)
  })
})
