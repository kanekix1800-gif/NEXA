import { paths } from '@/app/paths'
import { config } from '@/config'
import {
  checkStock,
  computeSaleTotals,
  describeShortages,
  lineTotalCents,
  mergeSaleItems,
  quantityError,
  roundQuantity,
  type SaleItemRequest,
} from '@/services/business/sales'
import {
  PAYMENT_METHOD_LABEL,
  type PaymentMethod,
  type Product,
  type Sale,
  type SaleItem,
  type Transaction,
} from '@/types'
import { now, nowISO } from '@/utils/clock'
import { isWithinRange } from '@/utils/dates'
import { AppError, validationError } from '@/utils/errors'
import { formatQuantity } from '@/utils/format'
import { createId } from '@/utils/id'

import type { SalesRepository } from '../contracts'
import { findManagedRecord, requireBusinessManager } from './businesses.access'
import { optionalText, pushNotification, type LocalContext } from './context'

/** Tolerância para relógios levemente adiantados ao informar o momento da venda. */
const FUTURE_TOLERANCE_MS = 60_000

function fail(field: string, message: string): never {
  throw validationError(message, { [field]: message })
}

const newestFirst = (a: Sale, b: Sale) =>
  b.soldAt.localeCompare(a.soldAt) || b.createdAt.localeCompare(a.createdAt)

function resolveSoldAt(value: unknown): string {
  if (value === undefined || value === null || value === '') return nowISO()
  const date = typeof value === 'string' ? new Date(value) : new Date(Number.NaN)
  if (Number.isNaN(date.getTime())) fail('soldAt', 'Informe uma data válida para a venda.')
  if (date.getTime() > now().getTime() + FUTURE_TOLERANCE_MS) {
    fail('soldAt', 'A data da venda não pode estar no futuro.')
  }
  return date.toISOString()
}

function requirePaymentMethod(value: unknown): PaymentMethod {
  if (typeof value !== 'string' || !Object.hasOwn(PAYMENT_METHOD_LABEL, value)) {
    fail('paymentMethod', 'Escolha a forma de pagamento.')
  }
  return value as PaymentMethod
}

export function createSalesRepository(ctx: LocalContext): SalesRepository {
  return {
    async list(businessId, filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireBusinessManager(db, businessId)
        return db.sales
          .filter(
            (sale) => sale.businessId === businessId && isWithinRange(sale.soldAt, filters.range),
          )
          .sort(newestFirst)
      })
    },

    async get(id) {
      await ctx.latency()
      return ctx.store.read((db) => findManagedRecord(db, db.sales, id).record ?? null)
    },

    async register(businessId, input) {
      await ctx.latency()
      return ctx.store.write(['products', 'sales', 'transactions', 'notifications'], (db) => {
        const { user, business } = requireBusinessManager(db, businessId)

        // 1. Itens: produtos do próprio negócio, ativos, com quantidades válidas.
        if (!Array.isArray(input.items) || input.items.length === 0) {
          fail('items', 'Adicione pelo menos um item à venda.')
        }
        const products = new Map<string, Product>()
        for (const item of input.items) {
          const product = db.products.find(
            (candidate) => candidate.id === item?.productId && candidate.businessId === businessId,
          )
          if (!product || !product.active) {
            fail('items', 'Um dos produtos da venda não está disponível. Revise os itens.')
          }
          const error = quantityError(item.quantity, product.unit)
          if (error) fail('items', `${product.name}: ${error}`)
          products.set(product.id, product)
        }
        const items: SaleItemRequest[] = mergeSaleItems(input.items)
        const productOf = (id: string) => products.get(id) as Product

        // 2. Estoque: sem permissão de estoque negativo, nada é gravado se faltar.
        const shortages = checkStock(
          items,
          [...products.values()],
          business.settings.allowNegativeStock,
        )
        if (shortages.length > 0) {
          throw new AppError('insufficient_stock', describeShortages(shortages), {
            details: shortages,
          })
        }

        // 3. Totais, forma de pagamento, momento e observação.
        const lines: SaleItem[] = items.map((item) => {
          const product = productOf(item.productId)
          return {
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPriceCents: product.priceCents,
            subtotalCents: lineTotalCents(item.quantity, product.priceCents),
          }
        })
        const totals = computeSaleTotals(lines, input.discountCents ?? 0)
        const paymentMethod = requirePaymentMethod(input.paymentMethod)
        const soldAt = resolveSoldAt(input.soldAt)
        const note = optionalText(input.note, {
          field: 'note',
          label: 'A observação',
          max: config.limits.noteMaxLength,
        })
        const createdAt = nowISO()

        // 4. Baixa do estoque (somente produtos com controle de estoque).
        const reachedMinimum: Product[] = []
        for (const item of items) {
          const product = productOf(item.productId)
          if (!product.trackStock) continue
          const before = product.stock
          product.stock = roundQuantity(before - item.quantity)
          product.updatedAt = createdAt
          if (before > product.minStock && product.stock <= product.minStock) {
            reachedMinimum.push(product)
          }
        }

        const sale: Sale = {
          id: createId('sal'),
          businessId,
          items: lines,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          totalCents: totals.totalCents,
          paymentMethod,
          ...(note ? { note } : {}),
          createdBy: user.id,
          soldAt,
          createdAt,
        }
        db.sales.push(sale)

        // 5. Lançamento de receita vinculado à venda.
        const transaction: Transaction = {
          id: createId('trx'),
          businessId,
          type: 'income',
          category: 'sales',
          description: `Venda — ${lines.length} ${lines.length === 1 ? 'item' : 'itens'}`,
          amountCents: totals.totalCents,
          date: soldAt,
          saleId: sale.id,
          createdBy: user.id,
          createdAt,
        }
        db.transactions.push(transaction)

        // 6. Alerta de estoque baixo para quem cruzou o mínimo nesta venda.
        for (const product of reachedMinimum) {
          pushNotification(db, {
            userId: business.ownerId,
            category: 'commerce',
            title: 'Estoque baixo',
            body: `${product.name}: restam ${formatQuantity(product.stock)} ${product.unit}`,
            link: paths.businessProducts,
          })
        }

        return sale
      })
    },
  }
}
