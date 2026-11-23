import type { Cents, ID, ISODate } from './common'
import type { PaymentMethod, Product, TransactionCategory } from './commerce'

/** Períodos pré-definidos dos painéis do NEXA Business. */
export type PeriodPreset = '7d' | '30d' | '90d'

export const PERIOD_PRESET_LABEL: Record<PeriodPreset, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
}

/** Ponto de uma série diária de vendas. */
export interface DailySalesPoint {
  /** Início do dia (ISO). */
  date: ISODate
  /** Rótulo curto para o eixo (ex.: "03/11"). */
  label: string
  revenueCents: Cents
  salesCount: number
}

/** Ponto de uma série de receitas x despesas. */
export interface CashFlowPoint {
  date: ISODate
  label: string
  incomeCents: Cents
  expenseCents: Cents
  /** Receitas − despesas do período. */
  netCents: Cents
  /** Saldo acumulado desde o início do intervalo analisado. */
  balanceCents: Cents
}

export interface ProductRankingItem {
  productId: ID
  name: string
  quantity: number
  revenueCents: Cents
}

export interface ExpenseSlice {
  category: TransactionCategory
  label: string
  amountCents: Cents
  /** Participação no total de despesas (0 a 1). */
  share: number
}

export interface PaymentSlice {
  method: PaymentMethod
  label: string
  amountCents: Cents
  count: number
  share: number
}

/**
 * Resumo do desempenho de um estabelecimento em um período.
 * Calculado por funções puras em `src/services/business/metrics.ts`,
 * exclusivamente a partir de produtos, vendas e lançamentos do próprio negócio.
 */
export interface BusinessSummary {
  period: { from: ISODate; to: ISODate; days: number }
  /** Faturamento: soma do total das vendas do período. */
  revenueCents: Cents
  /** Todas as receitas lançadas no período (vendas + outras receitas). */
  incomeCents: Cents
  /** Todas as despesas lançadas no período. */
  expenseCents: Cents
  /** Lucro estimado: receitas − despesas do período. */
  profitCents: Cents
  salesCount: number
  /** Ticket médio (faturamento ÷ vendas) ou 0 sem vendas. */
  averageTicketCents: Cents
  itemsSold: number
  /** Comparação com o período imediatamente anterior, de mesma duração. */
  previous: {
    revenueCents: Cents
    expenseCents: Cents
    profitCents: Cents
    salesCount: number
  }
  /** Variação percentual em relação ao período anterior (`null` quando não há base de comparação). */
  change: {
    revenue: number | null
    expense: number | null
    profit: number | null
    salesCount: number | null
  }
  /** Produtos ativos com controle de estoque. */
  stockedProducts: number
  /** Soma das quantidades em estoque. */
  stockUnits: number
  /** Valor do estoque a preço de venda. */
  stockValueCents: Cents
  lowStock: Product[]
  outOfStock: Product[]
  salesByDay: DailySalesPoint[]
  cashFlow: CashFlowPoint[]
  topProducts: ProductRankingItem[]
  expensesByCategory: ExpenseSlice[]
  paymentMix: PaymentSlice[]
}
