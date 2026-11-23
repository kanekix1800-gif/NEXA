import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_CATEGORY_LABEL,
  type Transaction,
  type TransactionCategory,
  type TransactionType,
} from '@/types'
import { now, nowISO } from '@/utils/clock'
import { isWithinRange } from '@/utils/dates'
import { conflictError, validationError } from '@/utils/errors'
import { createId } from '@/utils/id'

import type { TransactionsRepository } from '../contracts'
import { requireBusinessManager, requireManagedRecord } from './businesses.access'
import { requireText, type LocalContext } from './context'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function fail(field: string, message: string): never {
  throw validationError(message, { [field]: message })
}

const newestFirst = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)

function requireType(value: unknown): TransactionType {
  if (value !== 'income' && value !== 'expense') {
    fail('type', 'Escolha se o lançamento é uma receita ou uma despesa.')
  }
  return value
}

function requireCategory(value: unknown, type: TransactionType): TransactionCategory {
  if (typeof value !== 'string' || !Object.hasOwn(TRANSACTION_CATEGORY_LABEL, value)) {
    fail('category', 'Escolha uma categoria.')
  }
  const category = value as TransactionCategory
  const allowed = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  if (!allowed.includes(category)) {
    fail(
      'category',
      type === 'income' ? 'Escolha uma categoria de receita.' : 'Escolha uma categoria de despesa.',
    )
  }
  return category
}

function requireAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    fail('amountCents', 'Informe um valor maior que zero.')
  }
  return value
}

function requireDate(value: unknown): string {
  const date = typeof value === 'string' ? new Date(value) : new Date(Number.NaN)
  if (Number.isNaN(date.getTime())) fail('date', 'Informe uma data válida.')
  if (date.getTime() > now().getTime() + ONE_DAY_MS) {
    fail('date', 'A data do lançamento pode estar no máximo 1 dia no futuro.')
  }
  return date.toISOString()
}

export function createTransactionsRepository(ctx: LocalContext): TransactionsRepository {
  return {
    async list(businessId, filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireBusinessManager(db, businessId)
        return db.transactions
          .filter(
            (entry) =>
              entry.businessId === businessId &&
              isWithinRange(entry.date, filters.range) &&
              (filters.type === undefined || entry.type === filters.type) &&
              (filters.category === undefined || entry.category === filters.category),
          )
          .sort(newestFirst)
      })
    },

    async create(businessId, input) {
      await ctx.latency()
      return ctx.store.write(['transactions'], (db) => {
        const { user } = requireBusinessManager(db, businessId)
        const type = requireType(input.type)
        const transaction: Transaction = {
          id: createId('trx'),
          businessId,
          type,
          category: requireCategory(input.category, type),
          description: requireText(input.description, {
            field: 'description',
            label: 'A descrição',
            min: 2,
            max: 120,
          }),
          amountCents: requireAmount(input.amountCents),
          date: requireDate(input.date),
          createdBy: user.id,
          createdAt: nowISO(),
        }
        db.transactions.push(transaction)
        return transaction
      })
    },

    async remove(id) {
      await ctx.latency()
      ctx.store.write(['transactions'], (db) => {
        const { record } = requireManagedRecord(
          db,
          db.transactions,
          id,
          'Lançamento não encontrado.',
        )
        if (record.saleId) {
          throw conflictError('Lançamentos gerados por vendas não podem ser removidos.')
        }
        db.transactions = db.transactions.filter((entry) => entry.id !== record.id)
      })
    },
  }
}
