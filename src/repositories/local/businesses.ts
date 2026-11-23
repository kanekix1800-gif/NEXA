import { paths } from '@/app/paths'
import { config } from '@/config'
import { can } from '@/services/permissions'
import {
  ACCESSIBILITY_FEATURE_LABEL,
  type Business,
  type BusinessView,
  type CatalogItem,
  type Category,
  type Database,
  type DayHours,
  type GeoPoint,
  type Review,
  type ReviewView,
  type User,
  type WeekSchedule,
} from '@/types'
import { now, nowISO } from '@/utils/clock'
import { conflictError, forbiddenError, notFoundError, validationError } from '@/utils/errors'
import { distanceMeters as geoDistance } from '@/utils/geo'
import { createId } from '@/utils/id'
import { hoursForDay, isOpenAt, isValidClock } from '@/utils/schedule'
import { matchesSearch, normalizeText, truncate } from '@/utils/text'

import type { BusinessInput, BusinessesRepository } from '../contracts'
import {
  accessibilityFeatures,
  currentUser,
  imageList,
  neighborhoodName,
  optionalImage,
  profileOf,
  pushNotification,
  referencePoint,
  requireEmail,
  requireGeoPoint,
  requirePermission,
  requireRecord,
  requireText,
  requireUser,
  type LocalContext,
} from './context'

const BUSINESS_NOT_FOUND = 'Estabelecimento não encontrado.'
const MAX_TAGS = 8
const TAG_MAX_LENGTH = 24
const MAX_GALLERY = 6

function fail(field: string, message: string): never {
  throw validationError(message, { [field]: message })
}

// ── Modelos de visualização ──────────────────────────────────────────────────

/** Categoria exibida quando a categoria original foi removida. */
function fallbackCategory(db: Database): Category {
  return (
    db.categories.find(
      (category) => category.kind === 'business' && normalizeText(category.name) === 'outros',
    ) ?? {
      id: 'cat_biz_outros',
      kind: 'business',
      name: 'Outros',
      icon: 'store',
      color: 'gray',
      active: true,
      system: true,
      order: 999,
    }
  )
}

function ratingOf(reviews: Review[]): number | null {
  if (reviews.length === 0) return null
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  return Math.round(average * 10) / 10
}

function isVisibleTo(business: Business, viewer: User | null): boolean {
  return (
    business.status === 'active' ||
    (viewer !== null && (viewer.id === business.ownerId || viewer.role === 'admin'))
  )
}

function toBusinessView(
  db: Database,
  business: Business,
  viewer: User | null,
  near?: GeoPoint,
): BusinessView {
  const { settings, ...publicData } = business
  const reviews = db.reviews.filter((review) => review.businessId === business.id)
  const isMine = viewer !== null && viewer.id === business.ownerId
  const moment = now()
  return {
    ...publicData,
    // Configurações privadas: somente para o proprietário.
    ...(isMine ? { settings: { ...settings } } : {}),
    category:
      db.categories.find((category) => category.id === business.categoryId) ?? fallbackCategory(db),
    neighborhoodName: neighborhoodName(db, business.neighborhoodId),
    rating: ratingOf(reviews),
    reviewCount: reviews.length,
    isOpenNow: isOpenAt(business.schedule, moment),
    todayHours: hoursForDay(business.schedule, moment),
    distanceMeters: Math.round(geoDistance(referencePoint(db, viewer, near), business.location)),
    isFavorite:
      viewer !== null &&
      db.favorites.some(
        (favorite) => favorite.userId === viewer.id && favorite.businessId === business.id,
      ),
    isMine,
  }
}

function toReviewView(db: Database, review: Review, viewer: User | null): ReviewView {
  return {
    ...review,
    author: profileOf(db, review.authorId),
    isMine: viewer !== null && viewer.id === review.authorId,
  }
}

const byName = (a: BusinessView, b: BusinessView) => a.name.localeCompare(b.name, 'pt-BR')

function byDistance(a: BusinessView, b: BusinessView): number {
  const da = a.distanceMeters ?? Number.POSITIVE_INFINITY
  const dbb = b.distanceMeters ?? Number.POSITIVE_INFINITY
  return da - dbb || byName(a, b)
}

function byRating(a: BusinessView, b: BusinessView): number {
  // Sem avaliações por último.
  if (a.rating === null || b.rating === null) {
    if (a.rating === b.rating) return byName(a, b)
    return a.rating === null ? 1 : -1
  }
  return b.rating - a.rating || b.reviewCount - a.reviewCount || byName(a, b)
}

// ── Validação ────────────────────────────────────────────────────────────────

function requirePhone(value: unknown, field: 'phone' | 'whatsapp', label: string): string {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : ''
  if (digits.length !== 10 && digits.length !== 11) {
    fail(field, `Informe ${label} com DDD (10 ou 11 dígitos).`)
  }
  return digits
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

function optionalWhatsapp(value: unknown): string | undefined {
  return isBlank(value) ? undefined : requirePhone(value, 'whatsapp', 'um WhatsApp')
}

function optionalEmail(value: unknown): string | undefined {
  return isBlank(value) ? undefined : requireEmail(value, 'email')
}

function optionalInstagram(value: unknown): string | undefined {
  if (isBlank(value)) return undefined
  const handle = typeof value === 'string' ? value.trim().replace(/^@/, '') : ''
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    fail('instagram', 'Informe um perfil do Instagram válido (sem espaços).')
  }
  return handle
}

function requireSchedule(value: unknown): WeekSchedule {
  const message = 'Informe os horários de funcionamento no formato HH:mm para os 7 dias da semana.'
  if (!Array.isArray(value) || value.length !== 7) fail('schedule', message)
  return value.map((day: unknown): DayHours | null => {
    if (day === null || day === undefined) return null
    const { open, close } = (typeof day === 'object' ? day : {}) as Partial<DayHours>
    if (typeof open !== 'string' || typeof close !== 'string') fail('schedule', message)
    if (!isValidClock(open) || !isValidClock(close)) fail('schedule', message)
    return { open, close }
  }) as WeekSchedule
}

function requireTags(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) fail('tags', 'Informe os destaques como uma lista.')
  const tags: string[] = []
  for (const raw of value) {
    const tag = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : ''
    if (tag === '') continue
    if (tag.length > TAG_MAX_LENGTH) {
      fail('tags', `Cada destaque deve ter no máximo ${TAG_MAX_LENGTH} caracteres.`)
    }
    if (!tags.some((existing) => normalizeText(existing) === normalizeText(tag))) tags.push(tag)
  }
  if (tags.length > MAX_TAGS) fail('tags', `Use no máximo ${MAX_TAGS} destaques.`)
  return tags
}

function requireBusinessCategory(db: Database, value: unknown, current?: string): string {
  const category = db.categories.find((candidate) => candidate.id === value)
  // Mantém a categoria atual mesmo que tenha sido desativada depois do cadastro.
  const keepsCurrent = current !== undefined && value === current
  if (!category || category.kind !== 'business' || (!category.active && !keepsCurrent)) {
    fail('categoryId', 'Escolha uma categoria válida.')
  }
  return category.id
}

function requireNeighborhood(db: Database, value: unknown): string {
  const neighborhood = db.neighborhoods.find((candidate) => candidate.id === value)
  if (!neighborhood) fail('neighborhoodId', 'Escolha um bairro válido.')
  return neighborhood.id
}

const nameRule = {
  field: 'name',
  label: 'O nome do estabelecimento',
  min: 3,
  max: config.limits.businessNameMaxLength,
}
const descriptionRule = {
  field: 'description',
  label: 'A descrição',
  min: 10,
  max: config.limits.businessDescriptionMaxLength,
}
const addressRule = {
  field: 'address',
  label: 'O endereço',
  min: 5,
  max: config.limits.addressMaxLength,
}

/** Aplica ao estabelecimento os campos informados (já validados). */
function applyPatch(db: Database, business: Business, patch: Partial<BusinessInput>): void {
  if (patch.name !== undefined) business.name = requireText(patch.name, nameRule)
  if (patch.description !== undefined) {
    business.description = requireText(patch.description, descriptionRule)
  }
  if (patch.categoryId !== undefined) {
    business.categoryId = requireBusinessCategory(db, patch.categoryId, business.categoryId)
  }
  if (patch.illustration !== undefined) business.illustration = patch.illustration
  if (patch.coverUrl !== undefined) {
    const coverUrl = optionalImage(patch.coverUrl, 'coverUrl')
    if (coverUrl) business.coverUrl = coverUrl
    else delete business.coverUrl
  }
  if (patch.gallery !== undefined)
    business.gallery = imageList(patch.gallery, 'gallery', MAX_GALLERY)
  if (patch.address !== undefined) business.address = requireText(patch.address, addressRule)
  if (patch.neighborhoodId !== undefined) {
    business.neighborhoodId = requireNeighborhood(db, patch.neighborhoodId)
  }
  if (patch.location !== undefined) {
    business.location = requireGeoPoint(patch.location, 'location', 'A localização')
  }
  if (patch.phone !== undefined) business.phone = requirePhone(patch.phone, 'phone', 'um telefone')

  const contacts = {
    whatsapp: optionalWhatsapp,
    email: optionalEmail,
    instagram: optionalInstagram,
  } as const
  for (const key of Object.keys(contacts) as Array<keyof typeof contacts>) {
    if (patch[key] === undefined) continue
    const value = contacts[key](patch[key])
    if (value) business[key] = value
    else delete business[key]
  }

  if (patch.schedule !== undefined) business.schedule = requireSchedule(patch.schedule)
  if (patch.tags !== undefined) business.tags = requireTags(patch.tags)
  if (patch.accessibility !== undefined) {
    business.accessibility = accessibilityFeatures(patch.accessibility)
  }
  if (patch.settings !== undefined) {
    const allow = patch.settings.allowNegativeStock
    if (allow !== undefined) business.settings.allowNegativeStock = allow === true
  }
  if (patch.status !== undefined) {
    if (patch.status !== 'active' && patch.status !== 'inactive') {
      fail('status', 'Situação inválida.')
    }
    business.status = patch.status
  }
}

// ── Repositório ──────────────────────────────────────────────────────────────

export function createBusinessesRepository(ctx: LocalContext): BusinessesRepository {
  return {
    async list(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const viewer = currentUser(db)
        const views = db.businesses
          .filter(
            (business) =>
              business.status === 'active' &&
              (filters.categoryId === undefined || business.categoryId === filters.categoryId) &&
              (filters.neighborhoodId === undefined ||
                business.neighborhoodId === filters.neighborhoodId) &&
              (filters.accessibility === undefined ||
                filters.accessibility.some((feature) =>
                  (business.accessibility ?? []).includes(feature),
                )),
          )
          .map((business) => toBusinessView(db, business, viewer, filters.near))
          .filter(
            (view) =>
              matchesSearch(
                filters.search,
                view.name,
                view.description,
                view.category.name,
                view.tags.join(' '),
                view.neighborhoodName,
                (view.accessibility ?? [])
                  .map((feature) => ACCESSIBILITY_FEATURE_LABEL[feature])
                  .join(' '),
              ) &&
              (!filters.onlyFavorites || view.isFavorite) &&
              (!filters.onlyOpenNow || view.isOpenNow),
          )
        const sort = filters.sort ?? 'distance'
        return views.sort(sort === 'name' ? byName : sort === 'rating' ? byRating : byDistance)
      })
    },

    async get(id, options = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const business = db.businesses.find((candidate) => candidate.id === id)
        const viewer = currentUser(db)
        if (!business || !isVisibleTo(business, viewer)) return null
        return toBusinessView(db, business, viewer, options.near)
      })
    },

    async getMine() {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const business =
          db.businesses.find((candidate) => candidate.id === user.businessId) ??
          db.businesses.find((candidate) => candidate.ownerId === user.id)
        return business ? toBusinessView(db, business, user) : null
      })
    },

    async create(input) {
      await ctx.latency()
      return ctx.store.write(['businesses', 'users'], (db) => {
        const user = requirePermission(
          db,
          'business:create',
          undefined,
          'Somente comerciantes que ainda não têm estabelecimento podem cadastrar um.',
        )
        if (db.businesses.some((business) => business.ownerId === user.id)) {
          throw conflictError('Você já possui um estabelecimento cadastrado.')
        }

        const timestamp = nowISO()
        const business: Business = {
          id: createId('biz'),
          ownerId: user.id,
          name: requireText(input.name, nameRule),
          categoryId: requireBusinessCategory(db, input.categoryId),
          description: requireText(input.description, descriptionRule),
          illustration: input.illustration ?? 'storefront',
          gallery: [],
          address: requireText(input.address, addressRule),
          neighborhoodId: requireNeighborhood(db, input.neighborhoodId),
          location: requireGeoPoint(input.location, 'location', 'A localização'),
          phone: requirePhone(input.phone, 'phone', 'um telefone'),
          schedule: requireSchedule(input.schedule),
          tags: [],
          settings: { allowNegativeStock: false },
          isDemo: false,
          status: 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        // Campos opcionais (contatos, imagens, destaques e configurações).
        // A situação inicial é sempre "ativo", independentemente de `input.status`.
        applyPatch(db, business, {
          coverUrl: input.coverUrl,
          gallery: input.gallery,
          whatsapp: input.whatsapp,
          email: input.email,
          instagram: input.instagram,
          tags: input.tags,
          accessibility: input.accessibility,
          settings: input.settings,
        })

        db.businesses.push(business)
        const owner = requireRecord(db.users, user.id)
        owner.businessId = business.id
        return toBusinessView(db, business, owner)
      })
    },

    async update(id, patch) {
      await ctx.latency()
      return ctx.store.write(['businesses'], (db) => {
        const user = requireUser(db)
        const business = requireRecord(db.businesses, id, BUSINESS_NOT_FOUND)
        if (!can(user, 'business:edit', { ownerId: business.ownerId })) {
          throw forbiddenError(
            'Somente o proprietário ou a administração podem editar este estabelecimento.',
          )
        }
        applyPatch(db, business, patch)
        business.updatedAt = nowISO()
        return toBusinessView(db, business, user)
      })
    },

    async toggleFavorite(id) {
      await ctx.latency()
      return ctx.store.write(['favorites'], (db) => {
        const user = requirePermission(db, 'business:favorite')
        const business = db.businesses.find((candidate) => candidate.id === id)
        if (!business || !isVisibleTo(business, user)) throw notFoundError(BUSINESS_NOT_FOUND)
        const index = db.favorites.findIndex(
          (favorite) => favorite.userId === user.id && favorite.businessId === id,
        )
        if (index >= 0) db.favorites.splice(index, 1)
        else db.favorites.push({ userId: user.id, businessId: id, createdAt: nowISO() })
        return toBusinessView(db, business, user)
      })
    },

    async listReviews(businessId) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireRecord(db.businesses, businessId, BUSINESS_NOT_FOUND)
        const viewer = currentUser(db)
        return db.reviews
          .filter((review) => review.businessId === businessId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((review) => toReviewView(db, review, viewer))
      })
    },

    async saveReview(businessId, input) {
      await ctx.latency()
      return ctx.store.write(['reviews', 'notifications'], (db) => {
        const user = requireUser(db)
        const business = db.businesses.find((candidate) => candidate.id === businessId)
        if (!business || business.status !== 'active') throw notFoundError(BUSINESS_NOT_FOUND)
        if (!can(user, 'business:review', { ownerId: business.ownerId })) {
          throw forbiddenError('Você não pode avaliar o próprio estabelecimento.')
        }
        const rating = input.rating
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
          fail('rating', 'Escolha uma nota de 1 a 5 estrelas.')
        }
        const comment = requireText(input.comment, {
          field: 'comment',
          label: 'O comentário',
          min: 3,
          max: config.limits.reviewMaxLength,
        })

        const timestamp = nowISO()
        let review = db.reviews.find(
          (candidate) => candidate.businessId === businessId && candidate.authorId === user.id,
        )
        if (review) {
          review.rating = rating
          review.comment = comment
          review.createdAt = timestamp
        } else {
          review = {
            id: createId('rev'),
            businessId,
            authorId: user.id,
            rating,
            comment,
            createdAt: timestamp,
          }
          db.reviews.push(review)
        }

        pushNotification(
          db,
          {
            userId: business.ownerId,
            category: 'commerce',
            title: 'Seu estabelecimento recebeu uma avaliação.',
            body: `${user.name} deu nota ${rating} de 5: “${truncate(comment, 80)}”`,
            link: paths.business(business.id),
          },
          user.id,
        )
        return toReviewView(db, review, user)
      })
    },

    async removeReview(reviewId) {
      await ctx.latency()
      ctx.store.write(['reviews'], (db) => {
        const user = requireUser(db)
        const review = requireRecord(db.reviews, reviewId, 'Avaliação não encontrada.')
        if (review.authorId !== user.id && user.role !== 'admin') {
          throw forbiddenError('Somente o autor ou a administração podem remover esta avaliação.')
        }
        db.reviews = db.reviews.filter((candidate) => candidate.id !== review.id)
      })
    },

    async listCatalog(businessId) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const business = db.businesses.find((candidate) => candidate.id === businessId)
        if (!business || !isVisibleTo(business, currentUser(db))) {
          throw notFoundError(BUSINESS_NOT_FOUND)
        }
        return db.products
          .filter(
            (product) =>
              product.businessId === businessId && product.showInCatalog && product.active,
          )
          .sort(
            (a, b) =>
              (a.group ?? '￿').localeCompare(b.group ?? '￿', 'pt-BR') ||
              a.name.localeCompare(b.name, 'pt-BR'),
          )
          .map((product): CatalogItem => ({
            // Somente dados públicos: NUNCA custo nem quantidade em estoque.
            id: product.id,
            businessId: product.businessId,
            name: product.name,
            ...(product.description ? { description: product.description } : {}),
            ...(product.group ? { group: product.group } : {}),
            priceCents: product.priceCents,
            unit: product.unit,
            available: !product.trackStock || product.stock > 0,
          }))
      })
    },
  }
}
