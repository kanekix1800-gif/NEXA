import { describe, expect, it } from 'vitest'

import type {
  PaymentMethod,
  Product,
  Sale,
  Transaction,
  TransactionCategory,
  TransactionType,
} from '@/types'
import { rangeForPreset } from '@/utils/dates'

import { computeBusinessSummary, percentChange, sumCents } from './metrics'

/** Quarta-feira, 18/11/2026, meio-dia (fuso local). */
const NOW = new Date(2026, 10, 18, 12, 0, 0, 0)
const at = (day: number, hour = 10) => new Date(2026, 10, day, hour, 0, 0, 0).toISOString()

function product(overrides: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    businessId: 'biz',
    priceCents: 100,
    trackStock: true,
    stock: 10,
    minStock: 2,
    unit: 'un',
    showInCatalog: true,
    active: true,
    createdAt: at(1),
    updatedAt: at(1),
    ...overrides,
  }
}

const PRODUCTS: Product[] = [
  product({ id: 'bread', name: 'Pão', priceCents: 100, stock: 50, minStock: 10 }),
  product({ id: 'cake', name: 'Bolo', priceCents: 2500, stock: 2, minStock: 2 }),
  product({
    id: 'coffee',
    name: 'Café',
    priceCents: 500,
    trackStock: false,
    stock: 0,
    minStock: 0,
  }),
  product({ id: 'juice', name: 'Suco', priceCents: 700, stock: 1.5, minStock: 1, unit: 'l' }),
  product({ id: 'flour', name: 'Farinha', priceCents: 800, stock: 0, minStock: 1 }),
  product({ id: 'old', name: 'Antigo', priceCents: 900, stock: 0, minStock: 5, active: false }),
]

const priceOf = (id: string) => PRODUCTS.find((entry) => entry.id === id)?.priceCents ?? 0

let sequence = 0
function sale(
  soldAt: string,
  paymentMethod: PaymentMethod,
  items: Array<[string, number]>,
  discountCents = 0,
): Sale {
  sequence += 1
  const lines = items.map(([productId, quantity]) => ({
    productId,
    productName: productId,
    quantity,
    unitPriceCents: priceOf(productId),
    subtotalCents: quantity * priceOf(productId),
  }))
  const subtotalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0)
  return {
    id: `sal_${sequence}`,
    businessId: 'biz',
    items: lines,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    paymentMethod,
    createdBy: 'usr',
    soldAt,
    createdAt: soldAt,
  }
}

function entry(
  date: string,
  type: TransactionType,
  category: TransactionCategory,
  amountCents: number,
): Transaction {
  sequence += 1
  return {
    id: `trx_${sequence}`,
    businessId: 'biz',
    type,
    category,
    description: category,
    amountCents,
    date,
    createdBy: 'usr',
    createdAt: date,
  }
}

// Período atual: 12/11 a 18/11. Período anterior: 05/11 a 11/11.
const SALES: Sale[] = [
  sale(at(12), 'pix', [
    ['bread', 10],
    ['coffee', 2],
  ]), // 2.000
  sale(
    at(14),
    'cash',
    [
      ['cake', 1],
      ['bread', 5],
    ],
    200,
  ), // 3.000 − 200 = 2.800
  sale(at(14, 16), 'debit_card', [['bread', 4]]), // 400
  sale(at(18, 9), 'pix', [
    ['coffee', 3],
    ['juice', 1],
  ]), // 1.500 + 700 = 2.200
  sale(at(8), 'pix', [['cake', 2]]), // período anterior: 5.000
  sale(at(1), 'cash', [['bread', 99]]), // fora dos dois períodos
]

const TRANSACTIONS: Transaction[] = [
  // receitas das vendas do período atual
  entry(at(12), 'income', 'sales', 2000),
  entry(at(14), 'income', 'sales', 2800),
  entry(at(14, 16), 'income', 'sales', 400),
  entry(at(18, 9), 'income', 'sales', 2200),
  entry(at(13), 'income', 'other_income', 300),
  // despesas do período atual
  entry(at(12), 'expense', 'suppliers', 1500),
  entry(at(15), 'expense', 'rent', 3000),
  entry(at(16), 'expense', 'suppliers', 500),
  entry(at(17), 'expense', 'utilities', 1000),
  // período anterior
  entry(at(8), 'income', 'sales', 5000),
  entry(at(8), 'expense', 'rent', 3000),
  // fora dos dois períodos
  entry(at(1), 'expense', 'taxes', 99_999),
]

function summary() {
  return computeBusinessSummary({
    products: PRODUCTS,
    sales: SALES,
    transactions: TRANSACTIONS,
    range: rangeForPreset('7d', NOW),
    now: NOW,
  })
}

describe('indicadores do NEXA Business', () => {
  it('auxiliares: soma de centavos e variação percentual', () => {
    expect(sumCents([100, 250, 1])).toBe(351)
    expect(sumCents([])).toBe(0)
    expect(percentChange(150, 100)).toBe(0.5)
    expect(percentChange(50, 100)).toBe(-0.5)
    expect(percentChange(10, 0)).toBeNull()
  })

  it('calcula faturamento, receitas, despesas, lucro e ticket médio do período', () => {
    const result = summary()
    const revenue = 2000 + 2800 + 400 + 2200
    const income = revenue + 300
    const expense = 1500 + 3000 + 500 + 1000

    expect(result.period.days).toBe(7)
    expect(result.revenueCents).toBe(revenue)
    expect(result.incomeCents).toBe(income)
    expect(result.expenseCents).toBe(expense)
    expect(result.profitCents).toBe(income - expense)
    expect(result.salesCount).toBe(4)
    expect(result.averageTicketCents).toBe(Math.round(revenue / 4))
    expect(result.itemsSold).toBe(10 + 2 + 1 + 5 + 4 + 3 + 1)
  })

  it('compara com o período anterior de mesma duração', () => {
    const result = summary()
    const revenue = 7400
    const profit = 7700 - 6000
    expect(result.previous).toEqual({
      revenueCents: 5000,
      expenseCents: 3000,
      profitCents: 2000,
      salesCount: 1,
    })
    expect(result.change.revenue).toBeCloseTo((revenue - 5000) / 5000)
    expect(result.change.expense).toBeCloseTo((6000 - 3000) / 3000)
    expect(result.change.profit).toBeCloseTo((profit - 2000) / 2000)
    expect(result.change.salesCount).toBeCloseTo((4 - 1) / 1)
  })

  it('sem base de comparação, a variação é nula', () => {
    const result = computeBusinessSummary({
      products: PRODUCTS,
      sales: SALES.slice(0, 4),
      transactions: TRANSACTIONS.slice(0, 9),
      range: rangeForPreset('7d', NOW),
    })
    expect(result.change).toEqual({ revenue: null, expense: null, profit: null, salesCount: null })
  })

  it('monta a série diária com todos os dias do período, inclusive os sem vendas', () => {
    const { salesByDay } = summary()
    expect(salesByDay.map((point) => point.label)).toEqual([
      '12/11',
      '13/11',
      '14/11',
      '15/11',
      '16/11',
      '17/11',
      '18/11',
    ])
    expect(salesByDay.map((point) => point.revenueCents)).toEqual([2000, 0, 3200, 0, 0, 0, 2200])
    expect(salesByDay.map((point) => point.salesCount)).toEqual([1, 0, 2, 0, 0, 0, 1])
    expect(new Date(salesByDay[0]!.date).getTime()).toBe(new Date(2026, 10, 12).getTime())
  })

  it('monta o fluxo de caixa diário com saldo acumulado', () => {
    const { cashFlow, profitCents } = summary()
    expect(cashFlow).toHaveLength(7)
    expect(cashFlow.map((point) => point.netCents)).toEqual([
      500, 300, 3200, -3000, -500, -1000, 2200,
    ])
    expect(cashFlow.map((point) => point.balanceCents)).toEqual([
      500, 800, 4000, 1000, 500, -500, 1700,
    ])
    expect(cashFlow.at(-1)?.balanceCents).toBe(profitCents)
    expect(cashFlow[0]).toMatchObject({ label: '12/11', incomeCents: 2000, expenseCents: 1500 })
  })

  it('agrupa o fluxo de caixa por semana em períodos longos', () => {
    const result = computeBusinessSummary({
      products: PRODUCTS,
      sales: SALES,
      transactions: TRANSACTIONS,
      range: rangeForPreset('90d', NOW),
    })
    expect(result.cashFlow).toHaveLength(Math.ceil(90 / 7))
    expect(result.salesByDay).toHaveLength(90)
    const totalNet = result.cashFlow.reduce((sum, point) => sum + point.netCents, 0)
    expect(totalNet).toBe(result.profitCents)
    expect(result.cashFlow.at(-1)?.balanceCents).toBe(result.profitCents)
  })

  it('ordena os produtos mais vendidos por quantidade e desempata pela receita', () => {
    const { topProducts } = summary()
    expect(topProducts).toEqual([
      { productId: 'bread', name: 'Pão', quantity: 19, revenueCents: 1900 },
      { productId: 'coffee', name: 'Café', quantity: 5, revenueCents: 2500 },
      { productId: 'cake', name: 'Bolo', quantity: 1, revenueCents: 2500 },
      { productId: 'juice', name: 'Suco', quantity: 1, revenueCents: 700 },
    ])
  })

  it('distribui as despesas por categoria, da maior para a menor', () => {
    const { expensesByCategory } = summary()
    expect(
      expensesByCategory.map(({ category, label, amountCents }) => ({
        category,
        label,
        amountCents,
      })),
    ).toEqual([
      { category: 'rent', label: 'Aluguel', amountCents: 3000 },
      { category: 'suppliers', label: 'Fornecedores', amountCents: 2000 },
      { category: 'utilities', label: 'Água, luz e internet', amountCents: 1000 },
    ])
    expect(expensesByCategory.map((slice) => slice.share)).toEqual([
      3000 / 6000,
      2000 / 6000,
      1000 / 6000,
    ])
  })

  it('calcula a distribuição por forma de pagamento', () => {
    const { paymentMix } = summary()
    expect(paymentMix).toEqual([
      { method: 'pix', label: 'Pix', amountCents: 4200, count: 2, share: 4200 / 7400 },
      { method: 'cash', label: 'Dinheiro', amountCents: 2800, count: 1, share: 2800 / 7400 },
      {
        method: 'debit_card',
        label: 'Cartão de débito',
        amountCents: 400,
        count: 1,
        share: 400 / 7400,
      },
    ])
  })

  it('resume o estoque considerando só produtos ativos com controle de estoque', () => {
    const result = summary()
    expect(result.stockedProducts).toBe(4)
    expect(result.stockUnits).toBe(50 + 2 + 1.5 + 0)
    expect(result.stockValueCents).toBe(50 * 100 + 2 * 2500 + Math.round(1.5 * 700))
    expect(result.lowStock.map((entry) => entry.id)).toEqual(['cake'])
    expect(result.outOfStock.map((entry) => entry.id)).toEqual(['flour'])
  })
})
