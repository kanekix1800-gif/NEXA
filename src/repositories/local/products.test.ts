import { describe, expect, it } from 'vitest'

import type { ProductInput } from '../contracts'
import { expectCode, OTHER, seedWithSecondBusiness } from './businesses.testkit'
import { createTestHarness } from './testing/harness'
import { FIXTURE } from './testing/fixture'

const { bread, cake, coffee } = FIXTURE.products

async function merchantHarness() {
  const t = await createTestHarness({ seed: seedWithSecondBusiness })
  t.signInAs(FIXTURE.users.merchant)
  return t
}

function productInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: '  Queijo minas  ',
    group: 'Frios',
    priceCents: 3290,
    costCents: 2100,
    trackStock: true,
    stock: 2.5,
    minStock: 1,
    unit: 'kg',
    showInCatalog: true,
    active: true,
    ...overrides,
  }
}

describe('produtos (NEXA Business)', () => {
  it('lista por nome, sem inativos por padrão, com busca e filtro de estoque baixo', async () => {
    const t = await merchantHarness()
    const names = async (options?: Parameters<typeof t.repos.products.list>[1]) =>
      (await t.repos.products.list(FIXTURE.business, options)).map((product) => product.name)

    expect(await names()).toEqual(['Bolo de cenoura', 'Café coado', 'Pão francês'])
    expect(await names({ includeInactive: true })).toEqual([
      'Bolo de cenoura',
      'Café coado',
      'Pão francês',
      'Sonho (fora de linha)',
    ])
    expect(await names({ search: 'pao' })).toEqual(['Pão francês'])
    expect(await names({ search: 'bebidas' })).toEqual(['Café coado'])
    expect(await names({ onlyLowStock: true })).toEqual(['Bolo de cenoura'])
  })

  it('cadastra produto com dados normalizados', async () => {
    const t = await merchantHarness()
    const product = await t.repos.products.create(FIXTURE.business, productInput())
    expect(product).toMatchObject({
      businessId: FIXTURE.business,
      name: 'Queijo minas',
      group: 'Frios',
      priceCents: 3290,
      costCents: 2100,
      stock: 2.5,
      unit: 'kg',
    })
    expect(await t.repos.products.get(product.id)).toEqual(product)
  })

  it('valida os dados do produto', async () => {
    const t = await merchantHarness()
    const cases: Array<[Partial<ProductInput>, string]> = [
      [{ name: 'Q' }, 'name'],
      [{ name: 'x'.repeat(61) }, 'name'],
      [{ priceCents: 10.5 }, 'priceCents'],
      [{ priceCents: -1 }, 'priceCents'],
      [{ costCents: -5 }, 'costCents'],
      [{ stock: -1 }, 'stock'],
      [{ stock: 1.2345 }, 'stock'],
      [{ unit: 'un', stock: 2.5 }, 'stock'],
      [{ unit: 'un', stock: 2, minStock: 0.5 }, 'minStock'],
      [{ unit: 'litro' as unknown as ProductInput['unit'] }, 'unit'],
    ]
    for (const [overrides, field] of cases) {
      const error = await expectCode(
        t.repos.products.create(FIXTURE.business, productInput(overrides)),
        'validation',
      )
      expect(error.fieldErrors, field).toHaveProperty(field)
    }
    // Custo é opcional.
    const product = await t.repos.products.create(
      FIXTURE.business,
      productInput({ costCents: null }),
    )
    expect(product).not.toHaveProperty('costCents')
  })

  it('atualiza campos enviados e revalida o estoque ao trocar a unidade', async () => {
    const t = await merchantHarness()
    const updated = await t.repos.products.update(bread, { priceCents: 120, group: '' })
    expect(updated.priceCents).toBe(120)
    expect(updated).not.toHaveProperty('group')
    expect(updated.name).toBe('Pão francês')

    const cheese = await t.repos.products.create(FIXTURE.business, productInput())
    await expectCode(t.repos.products.update(cheese.id, { unit: 'un' }), 'validation')
    const fixed = await t.repos.products.update(cheese.id, { unit: 'un', stock: 3 })
    expect(fixed).toMatchObject({ unit: 'un', stock: 3 })
  })

  it('remove produto sem vendas e apenas desativa produto com vendas', async () => {
    const t = await merchantHarness()
    await t.repos.sales.register(FIXTURE.business, {
      items: [{ productId: cake, quantity: 1 }],
      paymentMethod: 'cash',
    })

    await t.repos.products.remove(bread)
    await t.repos.products.remove(cake)

    const products = t.snapshot().products
    expect(products.find((product) => product.id === bread)).toBeUndefined()
    expect(products.find((product) => product.id === cake)).toMatchObject({
      active: false,
      showInCatalog: false,
    })
  })

  it('ajusta o estoque manualmente sem deixá-lo negativo', async () => {
    const t = await merchantHarness()
    expect((await t.repos.products.adjustStock(bread, 10)).stock).toBe(60)
    expect((await t.repos.products.adjustStock(bread, -15)).stock).toBe(45)

    const error = await expectCode(t.repos.products.adjustStock(cake, -3), 'validation')
    expect(error.fieldErrors).toHaveProperty('delta')
    await expectCode(t.repos.products.adjustStock(bread, 0.5), 'validation')
    await expectCode(t.repos.products.adjustStock(coffee, 5), 'conflict')

    await t.repos.businesses.update(FIXTURE.business, { settings: { allowNegativeStock: true } })
    expect((await t.repos.products.adjustStock(cake, -3)).stock).toBe(-1)
  })

  it('privacidade: outro comerciante, morador e administração não acessam os produtos', async () => {
    const t = await merchantHarness()
    for (const userId of [OTHER.owner, FIXTURE.users.resident, FIXTURE.users.admin]) {
      t.signInAs(userId)
      await expectCode(t.repos.products.list(FIXTURE.business), 'forbidden')
      await expectCode(t.repos.products.get(bread), 'forbidden')
      await expectCode(t.repos.products.create(FIXTURE.business, productInput()), 'forbidden')
      await expectCode(t.repos.products.update(bread, { priceCents: 1 }), 'forbidden')
      await expectCode(t.repos.products.adjustStock(bread, 1), 'forbidden')
      await expectCode(t.repos.products.remove(bread), 'forbidden')
    }

    // O dono acessa o próprio negócio, mas não os produtos da padaria.
    t.signInAs(OTHER.owner)
    expect((await t.repos.products.list(OTHER.business)).map((product) => product.id)).toEqual([
      OTHER.product,
    ])
    t.signInAs(FIXTURE.users.merchant)
    await expectCode(t.repos.products.get(OTHER.product), 'forbidden')
    expect(t.snapshot().products.find((product) => product.id === bread)?.priceCents).toBe(100)
  })
})
