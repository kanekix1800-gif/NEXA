import { COLOR_KEYS } from '@/components/icons/colors'
import type { Category, CategoryKind, ColorKey } from '@/types'
import { conflictError, validationError } from '@/utils/errors'
import { createId } from '@/utils/id'
import { normalizeText } from '@/utils/text'

import type { CategoryInput, ReferenceRepository } from '../contracts'
import {
  optionalText,
  requirePermission,
  requireRecord,
  requireText,
  type LocalContext,
} from './context'

const KINDS: ReadonlyArray<CategoryKind> = ['demand', 'business', 'event']

function assertColor(color: unknown): ColorKey {
  if (typeof color !== 'string' || !COLOR_KEYS.includes(color as ColorKey)) {
    const message = 'Selecione uma cor válida.'
    throw validationError(message, { color: message })
  }
  return color as ColorKey
}

function assertIcon(icon: unknown): string {
  if (typeof icon !== 'string' || icon.trim() === '') {
    const message = 'Selecione um ícone.'
    throw validationError(message, { icon: message })
  }
  return icon
}

function categoryName(value: unknown): string {
  return requireText(value, { field: 'name', label: 'O nome', min: 2, max: 40 })
}

function assertUniqueName(
  categories: Category[],
  kind: CategoryKind,
  name: string,
  ignoreId?: string,
): void {
  const normalized = normalizeText(name)
  const duplicated = categories.some(
    (item) => item.kind === kind && item.id !== ignoreId && normalizeText(item.name) === normalized,
  )
  if (duplicated) {
    throw conflictError('Já existe uma categoria com este nome.')
  }
}

export function createReferenceRepository(ctx: LocalContext): ReferenceRepository {
  return {
    async listNeighborhoods() {
      await ctx.latency(0.5)
      return ctx.store.read((db) =>
        [...db.neighborhoods].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      )
    },

    async listCategories(kind, options = {}) {
      await ctx.latency(0.5)
      return ctx.store.read((db) =>
        db.categories
          .filter((category) => category.kind === kind)
          .filter((category) => options.includeInactive || category.active)
          .sort((a, b) => a.order - b.order),
      )
    },

    async createCategory(input: CategoryInput) {
      await ctx.latency()
      return ctx.store.write(['categories'], (db) => {
        requirePermission(db, 'category:manage')
        if (!KINDS.includes(input.kind)) throw validationError('Tipo de categoria inválido.')
        const name = categoryName(input.name)
        assertUniqueName(db.categories, input.kind, name)
        const category: Category = {
          id: createId('cat'),
          kind: input.kind,
          name,
          description: optionalText(input.description, {
            field: 'description',
            label: 'A descrição',
            max: 200,
          }),
          icon: assertIcon(input.icon) as Category['icon'],
          color: assertColor(input.color),
          active: true,
          system: false,
          order:
            Math.max(
              0,
              ...db.categories.filter((item) => item.kind === input.kind).map((c) => c.order),
            ) + 1,
        }
        if (input.kind === 'demand' && input.defaultInstitutionId) {
          requireRecord(db.institutions, input.defaultInstitutionId, 'Instituição não encontrada.')
          category.defaultInstitutionId = input.defaultInstitutionId
        }
        db.categories.push(category)
        return category
      })
    },

    async updateCategory(id, patch) {
      await ctx.latency()
      return ctx.store.write(['categories'], (db) => {
        requirePermission(db, 'category:manage')
        const category = requireRecord(db.categories, id, 'Categoria não encontrada.')
        if (patch.name !== undefined) {
          const name = categoryName(patch.name)
          assertUniqueName(db.categories, category.kind, name, category.id)
          category.name = name
        }
        if (patch.description !== undefined) {
          category.description = optionalText(patch.description, {
            field: 'description',
            label: 'A descrição',
            max: 200,
          })
          if (category.description === undefined) delete category.description
        }
        if (patch.icon !== undefined) category.icon = assertIcon(patch.icon) as Category['icon']
        if (patch.color !== undefined) category.color = assertColor(patch.color)
        if (patch.active !== undefined) category.active = patch.active === true
        if (patch.defaultInstitutionId !== undefined && category.kind === 'demand') {
          if (patch.defaultInstitutionId === null) {
            delete category.defaultInstitutionId
          } else {
            requireRecord(
              db.institutions,
              patch.defaultInstitutionId,
              'Instituição não encontrada.',
            )
            category.defaultInstitutionId = patch.defaultInstitutionId
          }
        }
        return category
      })
    },

    async deleteCategory(id) {
      await ctx.latency()
      ctx.store.write(['categories'], (db) => {
        requirePermission(db, 'category:manage')
        const category = requireRecord(db.categories, id, 'Categoria não encontrada.')
        if (category.system) {
          throw conflictError('Categorias do sistema não podem ser excluídas — desative-a.')
        }
        const inUse =
          db.demands.some((item) => item.categoryId === id) ||
          db.businesses.some((item) => item.categoryId === id) ||
          db.events.some((item) => item.categoryId === id)
        if (inUse) {
          throw conflictError('Há registros usando esta categoria — desative-a em vez de excluir.')
        }
        db.categories = db.categories.filter((item) => item.id !== id)
      })
    },
  }
}
