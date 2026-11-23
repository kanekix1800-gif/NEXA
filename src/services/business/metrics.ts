import {
  PAYMENT_METHOD_LABEL,
  TRANSACTION_CATEGORY_LABEL,
  type BusinessSummary,
  type CashFlowPoint,
  type Cents,
  type DailySalesPoint,
  type DateRange,
  type ExpenseSlice,
  type ID,
  type PaymentMethod,
  type PaymentSlice,
  type Product,
  type ProductRankingItem,
  type Sale,
  type Transaction,
  type TransactionCategory,
} from '@/types'
import {
  addDays,
  formatDayMonth,
  isWithinRange,
  previousRange,
  rangeDays,
  startOfDay,
  toDateInputValue,
} from '@/utils/dates'

import { roundQuantity } from './sales'

/**
 * INDICADORES DO NEXA Business
 * ─────────────────────────────────────────────────────────────────────────────
 * Funções puras: recebem produtos, vendas e lançamentos de UM estabelecimento e
 * calculam o resumo do período (ver `BusinessSummary`). Valores em centavos.
 */

/** Acima deste número de dias, o fluxo de caixa é agrupado por semana. */
const DAILY_CASH_FLOW_MAX_DAYS = 31

const TOP_PRODUCTS_LIMIT = 5

/** Soma valores em centavos. */
export function sumCents(values: ReadonlyArray<Cents>): Cents {
  return values.reduce((sum, value) => sum + value, 0)
}

/**
 * Variação relativa entre o valor atual e o anterior (0,25 = +25%).
 * `null` quando o anterior é zero (sem base de comparação). O denominador usa o
 * módulo do valor anterior, para que a melhora de um lucro negativo apareça como alta.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

export interface BusinessSummaryInput {
  products: ReadonlyArray<Product>
  sales: ReadonlyArray<Sale>
  transactions: ReadonlyArray<Transaction>
  range: DateRange
  /**
   * Momento de referência (aceito por compatibilidade). Os indicadores dependem
   * apenas de `range` e do estado atual dos produtos.
   */
  now?: Date
}

interface PeriodTotals {
  revenueCents: Cents
  incomeCents: Cents
  expenseCents: Cents
  profitCents: Cents
  salesCount: number
}

function periodTotals(
  sales: ReadonlyArray<Sale>,
  transactions: ReadonlyArray<Transaction>,
): PeriodTotals {
  const incomeCents = sumCents(
    transactions.filter((entry) => entry.type === 'income').map((entry) => entry.amountCents),
  )
  const expenseCents = sumCents(
    transactions.filter((entry) => entry.type === 'expense').map((entry) => entry.amountCents),
  )
  return {
    revenueCents: sumCents(sales.map((sale) => sale.totalCents)),
    incomeCents,
    expenseCents,
    profitCents: incomeCents - expenseCents,
    salesCount: sales.length,
  }
}

/** Início de cada dia do período (fuso local), do primeiro ao último, inclusive. */
function daysOf(range: DateRange): Date[] {
  const first = startOfDay(range.from)
  const count = Math.max(0, rangeDays(range))
  return Array.from({ length: count }, (_, index) => addDays(first, index))
}

const dayKey = (value: string | Date): string => toDateInputValue(value)

function buildSalesByDay(range: DateRange, sales: ReadonlyArray<Sale>): DailySalesPoint[] {
  const byDay = new Map<string, { revenueCents: Cents; salesCount: number }>()
  for (const sale of sales) {
    const key = dayKey(sale.soldAt)
    const entry = byDay.get(key) ?? { revenueCents: 0, salesCount: 0 }
    entry.revenueCents += sale.totalCents
    entry.salesCount += 1
    byDay.set(key, entry)
  }
  return daysOf(range).map((day) => {
    const entry = byDay.get(dayKey(day))
    return {
      date: day.toISOString(),
      label: formatDayMonth(day),
      revenueCents: entry?.revenueCents ?? 0,
      salesCount: entry?.salesCount ?? 0,
    }
  })
}

function buildCashFlow(
  range: DateRange,
  transactions: ReadonlyArray<Transaction>,
): CashFlowPoint[] {
  const days = daysOf(range)
  const step = days.length > DAILY_CASH_FLOW_MAX_DAYS ? 7 : 1

  // Índice do dia (no período) de cada lançamento.
  const dayIndex = new Map(days.map((day, index) => [dayKey(day), index]))
  const buckets: Array<{ date: Date; incomeCents: Cents; expenseCents: Cents }> = []
  for (let index = 0; index < days.length; index += step) {
    buckets.push({ date: days[index] as Date, incomeCents: 0, expenseCents: 0 })
  }
  for (const entry of transactions) {
    const index = dayIndex.get(dayKey(entry.date))
    if (index === undefined) continue
    const bucket = buckets[Math.floor(index / step)]
    if (!bucket) continue
    if (entry.type === 'income') bucket.incomeCents += entry.amountCents
    else bucket.expenseCents += entry.amountCents
  }

  let balanceCents = 0
  return buckets.map((bucket) => {
    const netCents = bucket.incomeCents - bucket.expenseCents
    balanceCents += netCents
    return {
      date: bucket.date.toISOString(),
      label: formatDayMonth(bucket.date),
      incomeCents: bucket.incomeCents,
      expenseCents: bucket.expenseCents,
      netCents,
      balanceCents,
    }
  })
}

function buildTopProducts(
  sales: ReadonlyArray<Sale>,
  products: ReadonlyArray<Product>,
): ProductRankingItem[] {
  const ranking = new Map<ID, ProductRankingItem>()
  for (const sale of sales) {
    for (const item of sale.items) {
      const entry = ranking.get(item.productId) ?? {
        productId: item.productId,
        name: products.find((product) => product.id === item.productId)?.name ?? item.productName,
        quantity: 0,
        revenueCents: 0,
      }
      entry.quantity = roundQuantity(entry.quantity + item.quantity)
      entry.revenueCents += item.subtotalCents
      ranking.set(item.productId, entry)
    }
  }
  return [...ranking.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenueCents - a.revenueCents)
    .slice(0, TOP_PRODUCTS_LIMIT)
}

function buildExpensesByCategory(
  transactions: ReadonlyArray<Transaction>,
  expenseCents: Cents,
): ExpenseSlice[] {
  const byCategory = new Map<TransactionCategory, Cents>()
  for (const entry of transactions) {
    if (entry.type !== 'expense') continue
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amountCents)
  }
  return [...byCategory]
    .map(([category, amountCents]) => ({
      category,
      label: TRANSACTION_CATEGORY_LABEL[category],
      amountCents,
      share: expenseCents > 0 ? amountCents / expenseCents : 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents)
}

function buildPaymentMix(sales: ReadonlyArray<Sale>, revenueCents: Cents): PaymentSlice[] {
  const byMethod = new Map<PaymentMethod, { amountCents: Cents; count: number }>()
  for (const sale of sales) {
    const entry = byMethod.get(sale.paymentMethod) ?? { amountCents: 0, count: 0 }
    entry.amountCents += sale.totalCents
    entry.count += 1
    byMethod.set(sale.paymentMethod, entry)
  }
  return [...byMethod]
    .map(([method, entry]) => ({
      method,
      label: PAYMENT_METHOD_LABEL[method],
      amountCents: entry.amountCents,
      count: entry.count,
      share: revenueCents > 0 ? entry.amountCents / revenueCents : 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents || b.count - a.count)
}

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'pt-BR')

/** Resumo do desempenho do estabelecimento no período (ver `BusinessSummary`). */
export function computeBusinessSummary(input: BusinessSummaryInput): BusinessSummary {
  const { products, range } = input
  const previous = previousRange(range)

  const sales = input.sales.filter((sale) => isWithinRange(sale.soldAt, range))
  const transactions = input.transactions.filter((entry) => isWithinRange(entry.date, range))
  const current = periodTotals(sales, transactions)
  const before = periodTotals(
    input.sales.filter((sale) => isWithinRange(sale.soldAt, previous)),
    input.transactions.filter((entry) => isWithinRange(entry.date, previous)),
  )

  // Estoque: somente produtos ativos com controle de estoque (estado atual).
  const stocked = products.filter((product) => product.active && product.trackStock)
  const positiveStock = (product: Product) => Math.max(0, product.stock)

  return {
    period: { from: range.from, to: range.to, days: Math.max(0, rangeDays(range)) },
    revenueCents: current.revenueCents,
    incomeCents: current.incomeCents,
    expenseCents: current.expenseCents,
    profitCents: current.profitCents,
    salesCount: current.salesCount,
    averageTicketCents:
      current.salesCount > 0 ? Math.round(current.revenueCents / current.salesCount) : 0,
    itemsSold: roundQuantity(
      sales.reduce(
        (sum, sale) => sum + sale.items.reduce((items, item) => items + item.quantity, 0),
        0,
      ),
    ),
    previous: {
      revenueCents: before.revenueCents,
      expenseCents: before.expenseCents,
      profitCents: before.profitCents,
      salesCount: before.salesCount,
    },
    change: {
      revenue: percentChange(current.revenueCents, before.revenueCents),
      expense: percentChange(current.expenseCents, before.expenseCents),
      profit: percentChange(current.profitCents, before.profitCents),
      salesCount: percentChange(current.salesCount, before.salesCount),
    },
    stockedProducts: stocked.length,
    stockUnits: roundQuantity(stocked.reduce((sum, product) => sum + positiveStock(product), 0)),
    stockValueCents: sumCents(
      stocked.map((product) => Math.round(positiveStock(product) * product.priceCents)),
    ),
    lowStock: stocked
      .filter((product) => product.stock <= product.minStock && product.stock > 0)
      .sort(byName),
    outOfStock: stocked.filter((product) => product.stock <= 0).sort(byName),
    salesByDay: buildSalesByDay(range, sales),
    cashFlow: buildCashFlow(range, transactions),
    topProducts: buildTopProducts(sales, products),
    expensesByCategory: buildExpensesByCategory(transactions, current.expenseCents),
    paymentMix: buildPaymentMix(sales, current.revenueCents),
  }
}
