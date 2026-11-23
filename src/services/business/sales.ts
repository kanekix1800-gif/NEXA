import type { Cents, ID, Product, ProductUnit } from '@/types'
import { validationError } from '@/utils/errors'
import { formatQuantity } from '@/utils/format'

/**
 * REGRAS PURAS DE VENDAS E ESTOQUE (NEXA Business)
 * ─────────────────────────────────────────────────────────────────────────────
 * Funções sem acesso ao banco, usadas pelo repositório de vendas e pela interface
 * (pré-visualização do total, alerta de estoque). Valores monetários em centavos.
 */

/** Unidades vendidas apenas em quantidades inteiras. */
export const WHOLE_UNITS: readonly ProductUnit[] = ['un', 'pct', 'cx', 'dz']

/** Arredonda uma quantidade para no máximo 3 casas decimais. */
export function roundQuantity(quantity: number): number {
  return Math.round(quantity * 1000) / 1000
}

/** Indica se a unidade exige quantidades inteiras. */
export function isWholeUnit(unit: ProductUnit): boolean {
  return WHOLE_UNITS.includes(unit)
}

/** Total de uma linha da venda, em centavos inteiros. */
export function lineTotalCents(quantity: number, unitPriceCents: Cents): Cents {
  return Math.round(roundQuantity(quantity) * unitPriceCents)
}

export interface QuantityRuleOptions {
  /** Rótulo usado na mensagem (ex.: "A quantidade"). */
  label?: string
  /** Aceita zero (estoque) em vez de exigir valor positivo (venda). */
  allowZero?: boolean
}

/**
 * Valida uma quantidade para a unidade informada e devolve a mensagem de erro,
 * ou `null` quando é válida: número finito, positivo (ou zero, se permitido),
 * com até 3 casas decimais e inteiro nas unidades de `WHOLE_UNITS`.
 */
export function quantityError(
  value: unknown,
  unit: ProductUnit,
  options: QuantityRuleOptions = {},
): string | null {
  const label = options.label ?? 'A quantidade'
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${label} precisa ser um número.`
  }
  if (options.allowZero ? value < 0 : value <= 0) {
    return options.allowZero
      ? `${label} não pode ser negativa.`
      : `${label} precisa ser maior que zero.`
  }
  if (Math.abs(roundQuantity(value) - value) > 1e-9) {
    return `${label} aceita no máximo 3 casas decimais.`
  }
  if (isWholeUnit(unit) && !Number.isInteger(value)) {
    return `${label} precisa ser um número inteiro para esta unidade.`
  }
  return null
}

export interface SaleItemRequest {
  productId: ID
  quantity: number
}

/**
 * Soma as quantidades de produtos repetidos, preservando a ordem em que cada
 * produto apareceu pela primeira vez.
 */
export function mergeSaleItems(items: ReadonlyArray<SaleItemRequest>): SaleItemRequest[] {
  const merged = new Map<ID, number>()
  for (const item of items) {
    merged.set(item.productId, roundQuantity((merged.get(item.productId) ?? 0) + item.quantity))
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

export interface SaleTotals {
  subtotalCents: Cents
  discountCents: Cents
  totalCents: Cents
}

/**
 * Subtotal (soma das linhas), desconto e total de uma venda.
 * O desconto precisa ser um inteiro entre zero e o subtotal.
 */
export function computeSaleTotals(
  lines: ReadonlyArray<{ quantity: number; unitPriceCents: Cents }>,
  discountCents: Cents = 0,
): SaleTotals {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + lineTotalCents(line.quantity, line.unitPriceCents),
    0,
  )
  if (!Number.isInteger(discountCents) || discountCents < 0) {
    const message = 'Informe um desconto válido (valor positivo, em centavos).'
    throw validationError(message, { discountCents: message })
  }
  if (discountCents > subtotalCents) {
    const message = 'O desconto não pode ser maior que o subtotal da venda.'
    throw validationError(message, { discountCents: message })
  }
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents }
}

/** Item com estoque insuficiente para a venda. */
export interface StockShortage {
  productId: ID
  name: string
  requested: number
  available: number
}

/**
 * Lista os itens cujo pedido supera o estoque disponível. Considera apenas produtos
 * com `trackStock`; com `allowNegativeStock` não há faltas.
 */
export function checkStock(
  items: ReadonlyArray<SaleItemRequest>,
  products: ReadonlyArray<Product>,
  allowNegativeStock: boolean,
): StockShortage[] {
  if (allowNegativeStock) return []
  const shortages: StockShortage[] = []
  for (const item of mergeSaleItems(items)) {
    const product = products.find((candidate) => candidate.id === item.productId)
    if (!product || !product.trackStock) continue
    if (item.quantity > product.stock) {
      shortages.push({
        productId: product.id,
        name: product.name,
        requested: item.quantity,
        available: Math.max(0, product.stock),
      })
    }
  }
  return shortages
}

/** Mensagem amigável para uma venda bloqueada por falta de estoque. */
export function describeShortages(shortages: ReadonlyArray<StockShortage>): string {
  const list = shortages
    .map(
      (shortage) =>
        `${shortage.name} (pedido: ${formatQuantity(shortage.requested)}, disponível: ${formatQuantity(shortage.available)})`,
    )
    .join('; ')
  return `Estoque insuficiente para: ${list}. Ajuste as quantidades ou registre uma entrada de estoque.`
}

/** Produto ativo, com controle de estoque, no mínimo ou abaixo dele. */
export function isLowStock(product: Product): boolean {
  return product.active && product.trackStock && product.stock <= product.minStock
}
