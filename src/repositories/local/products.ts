import { config } from '@/config'
import { isLowStock, isWholeUnit, quantityError, roundQuantity } from '@/services/business/sales'
import { PRODUCT_UNIT_LABEL, type Cents, type Product, type ProductUnit } from '@/types'
import { nowISO } from '@/utils/clock'
import { conflictError, validationError } from '@/utils/errors'
import { createId } from '@/utils/id'
import { matchesSearch } from '@/utils/text'

import type { ProductInput, ProductsRepository } from '../contracts'
import {
  businessOf,
  findManagedRecord,
  requireBusinessManager,
  requireManagedRecord,
} from './businesses.access'
import { optionalText, requireText, type LocalContext } from './context'

const PRODUCT_NOT_FOUND = 'Produto não encontrado.'
const DESCRIPTION_MAX_LENGTH = 300
const GROUP_MAX_LENGTH = 40

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'pt-BR')

function fail(field: string, message: string): never {
  throw validationError(message, { [field]: message })
}

function requireUnit(value: unknown): ProductUnit {
  if (typeof value !== 'string' || !Object.hasOwn(PRODUCT_UNIT_LABEL, value)) {
    fail('unit', 'Escolha uma unidade de medida válida.')
  }
  return value as ProductUnit
}

function requirePrice(value: unknown): Cents {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail('priceCents', 'Informe um preço válido (zero ou mais).')
  }
  return value
}

function optionalCost(value: unknown): Cents | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail('costCents', 'Informe um custo válido (zero ou mais).')
  }
  return value
}

/** Estoque/estoque mínimo: zero ou mais, até 3 casas, inteiro nas unidades inteiras. */
function requireStockAmount(
  value: unknown,
  unit: ProductUnit,
  field: 'stock' | 'minStock',
): number {
  const label = field === 'stock' ? 'O estoque' : 'O estoque mínimo'
  const amount = value === undefined || value === null ? 0 : value
  const error = quantityError(amount, unit, { label, allowZero: true })
  if (error) fail(field, error)
  return roundQuantity(amount as number)
}

const nameRule = {
  field: 'name',
  label: 'O nome do produto',
  min: 2,
  max: config.limits.productNameMaxLength,
}

export function createProductsRepository(ctx: LocalContext): ProductsRepository {
  return {
    async list(businessId, options = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireBusinessManager(db, businessId)
        return db.products
          .filter(
            (product) =>
              product.businessId === businessId &&
              (options.includeInactive || product.active) &&
              (!options.onlyLowStock || isLowStock(product)) &&
              matchesSearch(options.search, product.name, product.group),
          )
          .sort(byName)
      })
    },

    async get(id) {
      await ctx.latency()
      return ctx.store.read((db) => findManagedRecord(db, db.products, id).record ?? null)
    },

    async create(businessId, input: ProductInput) {
      await ctx.latency()
      return ctx.store.write(['products'], (db) => {
        requireBusinessManager(db, businessId)
        const unit = requireUnit(input.unit)
        const timestamp = nowISO()
        const description = optionalText(input.description, {
          field: 'description',
          label: 'A descrição',
          max: DESCRIPTION_MAX_LENGTH,
        })
        const group = optionalText(input.group, {
          field: 'group',
          label: 'O grupo',
          max: GROUP_MAX_LENGTH,
        })
        const costCents = optionalCost(input.costCents)

        const product: Product = {
          id: createId('prd'),
          businessId,
          name: requireText(input.name, nameRule),
          ...(description ? { description } : {}),
          ...(group ? { group } : {}),
          priceCents: requirePrice(input.priceCents),
          ...(costCents !== undefined ? { costCents } : {}),
          trackStock: input.trackStock === true,
          stock: requireStockAmount(input.stock, unit, 'stock'),
          minStock: requireStockAmount(input.minStock, unit, 'minStock'),
          unit,
          showInCatalog: input.showInCatalog !== false,
          active: input.active !== false,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        db.products.push(product)
        return product
      })
    },

    async update(id, patch) {
      await ctx.latency()
      return ctx.store.write(['products'], (db) => {
        const { record: product } = requireManagedRecord(db, db.products, id, PRODUCT_NOT_FOUND)

        if (patch.name !== undefined) product.name = requireText(patch.name, nameRule)
        if (patch.description !== undefined) {
          const description = optionalText(patch.description, {
            field: 'description',
            label: 'A descrição',
            max: DESCRIPTION_MAX_LENGTH,
          })
          if (description) product.description = description
          else delete product.description
        }
        if (patch.group !== undefined) {
          const group = optionalText(patch.group, {
            field: 'group',
            label: 'O grupo',
            max: GROUP_MAX_LENGTH,
          })
          if (group) product.group = group
          else delete product.group
        }
        if (patch.priceCents !== undefined) product.priceCents = requirePrice(patch.priceCents)
        if (patch.costCents !== undefined) {
          const costCents = optionalCost(patch.costCents)
          if (costCents === undefined) delete product.costCents
          else product.costCents = costCents
        }
        if (patch.trackStock !== undefined) product.trackStock = patch.trackStock === true
        if (patch.showInCatalog !== undefined) product.showInCatalog = patch.showInCatalog === true
        if (patch.active !== undefined) product.active = patch.active === true

        const unitChanged = patch.unit !== undefined && patch.unit !== product.unit
        if (patch.unit !== undefined) product.unit = requireUnit(patch.unit)
        for (const field of ['stock', 'minStock'] as const) {
          if (patch[field] !== undefined) {
            product[field] = requireStockAmount(patch[field], product.unit, field)
          } else if (
            unitChanged &&
            isWholeUnit(product.unit) &&
            !Number.isInteger(product[field])
          ) {
            // Ao trocar para uma unidade inteira, o valor atual também precisa ser inteiro.
            fail(
              field,
              `${field === 'stock' ? 'O estoque' : 'O estoque mínimo'} precisa ser um número inteiro para esta unidade.`,
            )
          }
        }

        product.updatedAt = nowISO()
        return product
      })
    },

    async remove(id) {
      await ctx.latency()
      ctx.store.write(['products'], (db) => {
        const { record: product } = requireManagedRecord(db, db.products, id, PRODUCT_NOT_FOUND)
        const hasSales = db.sales.some(
          (sale) =>
            sale.businessId === product.businessId &&
            sale.items.some((item) => item.productId === product.id),
        )
        if (hasSales) {
          // Preserva o histórico de vendas: o produto apenas deixa de ser oferecido.
          product.active = false
          product.showInCatalog = false
          product.updatedAt = nowISO()
          return
        }
        db.products = db.products.filter((candidate) => candidate.id !== product.id)
      })
    },

    async adjustStock(id, delta) {
      await ctx.latency()
      return ctx.store.write(['products'], (db) => {
        const { record: product } = requireManagedRecord(db, db.products, id, PRODUCT_NOT_FOUND)
        if (!product.trackStock) {
          throw conflictError('Este produto não tem controle de estoque ativado.')
        }
        if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) {
          fail('delta', 'Informe uma quantidade diferente de zero.')
        }
        const error = quantityError(Math.abs(delta), product.unit)
        if (error) fail('delta', error)

        const next = roundQuantity(product.stock + delta)
        if (next < 0 && !businessOf(db, product.businessId).settings.allowNegativeStock) {
          fail(
            'delta',
            `A saída é maior que o estoque disponível (${roundQuantity(Math.max(0, product.stock))} ${product.unit}).`,
          )
        }
        product.stock = next
        product.updatedAt = nowISO()
        return product
      })
    },
  }
}
