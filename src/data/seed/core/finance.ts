import type {
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
  Transaction,
  TransactionCategory,
} from '@/types'

import { BUSINESSES, MERCHANTS } from '../cast'
import type { SeedContext } from '../context'
import { PADARIA_SCHEDULE } from './places'

/**
 * VENDAS E FINANÇAS DA PADARIA DO BAIRRO
 * ─────────────────────────────────────────────────────────────────────────────
 * Histórico de 63 dias gerado de forma determinística. Cada dia tem uma quantidade
 * fixa de vendas (por dia da semana) e uma meta de faturamento que cresce no tempo:
 * a semana mais recente fica cerca de 11% acima da anterior. Para cada dia, várias
 * combinações de itens são sorteadas e vence a mais próxima da meta — assim os
 * indicadores comparativos saem estáveis, qualquer que seja o dia em que a base é gerada.
 */

const HISTORY_DAYS = 63
const BUSINESS_ID = BUSINESSES.padaria.id
const OWNER_ID = MERCHANTS.carla.id
/** Ticket médio-alvo, em centavos. */
const AVERAGE_TICKET = 3300
const ATTEMPTS_PER_DAY = 40

/** Vendas por dia da semana (0 = domingo): mais movimento no fim de semana. */
const SALES_PER_WEEKDAY = [7, 4, 4, 5, 5, 6, 7] as const

/** Fator de crescimento: 1 hoje, caindo de forma contínua para dias mais antigos. */
function trend(daysAgo: number): number {
  return daysAgo <= 14 ? 1 - 0.0155 * daysAgo : 1 - 0.0155 * 14 - 0.0015 * (daysAgo - 14)
}

/** Peso de escolha dos itens (além do pão francês, que é tratado à parte). */
const ITEM_WEIGHTS: ReadonlyArray<readonly [string, number, number]> = [
  // [chave do produto, peso, quantidade máxima]
  ['cafe_coado', 3, 2],
  ['cafe_leite', 2, 2],
  ['pao_queijo', 3, 4],
  ['coxinha', 2.5, 3],
  ['bolo_cenoura', 2, 2],
  ['sonho', 1.5, 2],
  ['croissant', 1.5, 2],
  ['suco', 1.5, 2],
  ['empada', 1.5, 3],
  ['torta_frango', 0.7, 1],
  ['pao_integral', 1, 1],
  ['pao_forma', 1, 1],
  ['biscoito_polvilho', 1, 2],
  ['leite', 1, 2],
  ['manteiga', 0.6, 1],
]

const PAYMENT_WEIGHTS: ReadonlyArray<readonly [PaymentMethod, number]> = [
  ['pix', 45],
  ['cash', 20],
  ['debit_card', 20],
  ['credit_card', 15],
]

interface Draft {
  minuteOfDay: number
  items: SaleItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
}

function pickWeighted<T>(
  ctx: SeedContext,
  entries: ReadonlyArray<readonly [T, number, ...unknown[]]>,
): T {
  const total = entries.reduce((sum, entry) => sum + entry[1], 0)
  let roll = ctx.random() * total
  for (const entry of entries) {
    roll -= entry[1]
    if (roll < 0) return entry[0]
  }
  const last = entries[entries.length - 1]
  if (!last) throw new Error('Lista vazia.')
  return last[0]
}

function toItem(product: Product, quantity: number): SaleItem {
  return {
    productId: product.id,
    productName: product.name,
    quantity,
    unitPriceCents: product.priceCents,
    subtotalCents: Math.round(quantity * product.priceCents),
  }
}

function draftSale(
  ctx: SeedContext,
  catalog: ReadonlyMap<string, Product>,
  minuteOfDay: number,
  weekend: boolean,
): Draft {
  const itemCount = pickWeighted(ctx, [
    [1, 8],
    [2, 27],
    [3, 37],
    [4, 28],
  ] as const)

  const items: SaleItem[] = []
  const used = new Set<string>()
  const bread = catalog.get('pao_frances')
  // O pão francês entra na maior parte das vendas, em quantidade maior (campeão de vendas).
  if (bread && ctx.random() < 0.72) {
    items.push(toItem(bread, ctx.randomInt(weekend ? 6 : 4, weekend ? 16 : 12)))
    used.add('pao_frances')
  }
  while (items.length < itemCount) {
    const key = pickWeighted(ctx, ITEM_WEIGHTS)
    const product = catalog.get(key)
    if (!product || used.has(key)) continue
    const max = ITEM_WEIGHTS.find((entry) => entry[0] === key)?.[2] ?? 1
    items.push(toItem(product, ctx.randomInt(1, max)))
    used.add(key)
  }

  const subtotal = items.reduce((sum, item) => sum + item.subtotalCents, 0)
  const discount = subtotal >= 1500 && ctx.random() < 0.08 ? 50 * ctx.randomInt(1, 4) : 0
  return {
    minuteOfDay,
    items,
    subtotal,
    discount,
    total: subtotal - discount,
    paymentMethod: pickWeighted(ctx, PAYMENT_WEIGHTS),
  }
}

/** Minutos desde a meia-noite sorteados no horário de funcionamento, com picos de manhã e fim de tarde. */
function sampleMinutes(ctx: SeedContext, count: number, open: number, end: number): number[] {
  const minutes: number[] = []
  for (let i = 0; i < count; i += 1) {
    const peak = ctx.random()
    let minute: number
    if (peak < 0.5) minute = open + Math.floor(ctx.random() * Math.min(180, end - open))
    else if (peak < 0.8)
      minute = Math.max(open, end - 240) + Math.floor(ctx.random() * Math.min(240, end - open))
    else minute = open + Math.floor(ctx.random() * (end - open))
    minutes.push(Math.min(Math.max(minute, open), end - 1))
  }
  return minutes.sort((a, b) => a - b)
}

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

export function buildSales(ctx: SeedContext, products: readonly Product[]): Sale[] {
  const catalog = new Map<string, Product>()
  for (const product of products) {
    if (product.businessId === BUSINESS_ID)
      catalog.set(product.id.replace('prd_padaria_', ''), product)
  }

  const nowMinutes = ctx.now.getHours() * 60 + ctx.now.getMinutes()
  const drafts: Array<{ daysAgo: number; draft: Draft }> = []

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const reference = new Date(ctx.at(-daysAgo, 12))
    const weekday = reference.getDay()
    const hours = PADARIA_SCHEDULE[weekday]
    if (!hours) continue
    const open = toMinutes(hours.open)
    const close = toMinutes(hours.close)
    const end = daysAgo === 0 ? Math.min(close, nowMinutes - 3) : close

    const baseCount = SALES_PER_WEEKDAY[weekday] ?? 5
    const count =
      daysAgo === 0 ? Math.round((baseCount * Math.max(0, end - open)) / (close - open)) : baseCount
    if (count === 0 || end <= open) continue

    const target = baseCount * AVERAGE_TICKET * trend(daysAgo) * (count / baseCount)
    const weekend = weekday === 0 || weekday === 6

    let best: Draft[] = []
    let bestGap = Number.POSITIVE_INFINITY
    for (let attempt = 0; attempt < ATTEMPTS_PER_DAY; attempt += 1) {
      const minutes = sampleMinutes(ctx, count, open, end)
      const day = minutes.map((minute) => draftSale(ctx, catalog, minute, weekend))
      const gap = Math.abs(day.reduce((sum, sale) => sum + sale.total, 0) - target)
      if (gap < bestGap) {
        best = day
        bestGap = gap
      }
    }
    best.forEach((draft) => drafts.push({ daysAgo, draft }))
  }

  return drafts.map(({ daysAgo, draft }, index) => {
    const soldAt = ctx.at(-daysAgo, Math.floor(draft.minuteOfDay / 60), draft.minuteOfDay % 60)
    return {
      id: `sal_${String(index + 1).padStart(4, '0')}`,
      businessId: BUSINESS_ID,
      items: draft.items,
      subtotalCents: draft.subtotal,
      discountCents: draft.discount,
      totalCents: draft.total,
      paymentMethod: draft.paymentMethod,
      createdBy: OWNER_ID,
      soldAt,
      createdAt: soldAt,
    }
  })
}

// ── Lançamentos ──────────────────────────────────────────────────────────────

/** [dias atrás, categoria, descrição, valor em centavos] */
type ExpenseRow = readonly [number, TransactionCategory, string, number]

const SUPPLIER_NOTES = [
  'Fornecedor de farinha, açúcar e fermento',
  'Reposição de laticínios e ovos',
  'Compra de frios, queijos e recheios',
  'Fornecedor de carnes e frango para salgados',
] as const

function supplierExpenses(): ExpenseRow[] {
  const days = [1, 8, 15, 22, 29, 36, 43, 50, 57]
  return days.map((daysAgo, index) => {
    // Compras mais altas nas semanas recentes (o movimento cresceu).
    const amount = 30000 - Math.round(daysAgo * 60) + (index % 3) * 1000
    return [
      daysAgo,
      'suppliers',
      SUPPLIER_NOTES[index % SUPPLIER_NOTES.length] ?? SUPPLIER_NOTES[0],
      amount,
    ]
  })
}

const FIXED_EXPENSES: readonly ExpenseRow[] = [
  [5, 'rent', 'Aluguel do ponto', 78000],
  [35, 'rent', 'Aluguel do ponto', 78000],
  [13, 'utilities', 'Energia elétrica', 19800],
  [14, 'utilities', 'Água e esgoto', 5900],
  [20, 'utilities', 'Internet', 9900],
  [43, 'utilities', 'Energia elétrica', 18600],
  [44, 'utilities', 'Água e esgoto', 5700],
  [50, 'utilities', 'Internet', 9900],
  [3, 'payroll', 'Folha de pagamento — auxiliar de balcão', 52000],
  [33, 'payroll', 'Folha de pagamento — auxiliar de balcão', 52000],
  [8, 'taxes', 'Imposto mensal simplificado (DAS)', 8200],
  [38, 'taxes', 'Imposto mensal simplificado (DAS)', 8200],
  [16, 'marketing', 'Impressão de panfletos e banner', 9000],
  [47, 'marketing', 'Divulgação em redes sociais', 6000],
  [10, 'maintenance', 'Manutenção do forno (troca de resistência)', 24000],
  [26, 'other_expense', 'Embalagens e sacolas', 14500],
  [52, 'other_expense', 'Material de limpeza', 8800],
]

export function buildTransactions(ctx: SeedContext, sales: readonly Sale[]): Transaction[] {
  const incomes: Array<Omit<Transaction, 'id'>> = sales.map((sale) => ({
    businessId: BUSINESS_ID,
    type: 'income',
    category: 'sales',
    description: `Venda — ${sale.items.length} ${sale.items.length === 1 ? 'item' : 'itens'}`,
    amountCents: sale.totalCents,
    date: sale.soldAt,
    saleId: sale.id,
    createdBy: OWNER_ID,
    createdAt: sale.createdAt,
  }))

  const expenses: Array<Omit<Transaction, 'id'>> = [...supplierExpenses(), ...FIXED_EXPENSES].map(
    ([daysAgo, category, description, amountCents]) => {
      const date = ctx.at(-daysAgo, 9, 30)
      return {
        businessId: BUSINESS_ID,
        type: 'expense' as const,
        category,
        description,
        amountCents,
        date,
        createdBy: OWNER_ID,
        createdAt: date,
      }
    },
  )

  return [...incomes, ...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry, index) => ({ id: `trx_${String(index + 1).padStart(4, '0')}`, ...entry }))
}
