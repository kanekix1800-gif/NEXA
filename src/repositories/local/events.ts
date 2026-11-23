import { paths } from '@/app/paths'
import { config } from '@/config'
import { can } from '@/services/permissions'
import type {
  Category,
  CommunityEvent,
  Database,
  EntityAvatar,
  EventOrganizer,
  EventView,
  ID,
  IllustrationKey,
  User,
} from '@/types'
import { now, nowISO } from '@/utils/clock'
import { formatDateTime } from '@/utils/dates'
import { conflictError, forbiddenError, validationError } from '@/utils/errors'
import { createId } from '@/utils/id'
import { matchesSearch } from '@/utils/text'

import type { EventInput, EventsRepository } from '../contracts'
import {
  neighborhoodName,
  optionalGeoPoint,
  optionalImage,
  optionalText,
  profileOf,
  pushNotification,
  requirePermission,
  requireRecord,
  requireText,
  requireUser,
  requireVerifiedInstitution,
  type LocalContext,
} from './context'
import { deletePosts, insertPost, withoutKey } from './posts.shared'

const EVENT_NOT_FOUND = 'Evento não encontrado.'
const PREVIEW_SIZE = 5

/** Categoria exibida quando a categoria original do evento foi excluída. */
const FALLBACK_CATEGORY: Category = {
  id: 'cat_removida',
  kind: 'event',
  name: 'Outros',
  icon: 'calendar',
  color: 'gray',
  active: false,
  system: false,
  order: 999,
}

function fail(field: string, message: string): never {
  throw validationError(message, { [field]: message })
}

function categoryOf(db: Database, event: CommunityEvent): Category {
  return (
    db.categories.find((category) => category.id === event.categoryId) ?? {
      ...FALLBACK_CATEGORY,
      id: event.categoryId,
    }
  )
}

function organizerView(db: Database, event: CommunityEvent): EventView['organizerView'] {
  const { organizer } = event
  if (organizer.kind === 'institution') {
    const institution = db.institutions.find((candidate) => candidate.id === organizer.id)
    const avatar: EntityAvatar = {
      kind: 'institution',
      icon: institution?.icon ?? 'landmark',
      color: institution?.color ?? 'green',
    }
    return {
      name: institution?.name ?? organizer.name,
      to: paths.institution(organizer.id),
      avatar,
    }
  }
  if (organizer.kind === 'business') {
    const business = db.businesses.find((candidate) => candidate.id === organizer.id)
    const avatar: EntityAvatar = {
      kind: 'business',
      coverUrl: business?.coverUrl,
      illustration: business?.illustration,
    }
    return { name: business?.name ?? organizer.name, to: paths.business(organizer.id), avatar }
  }
  const exists = db.users.some((candidate) => candidate.id === organizer.id)
  const profile = profileOf(db, organizer.id)
  return {
    name: exists ? profile.name : organizer.name,
    to: exists ? paths.userProfile(organizer.id) : undefined,
    avatar: { kind: 'user', avatar: profile.avatar, photoUrl: profile.photoUrl },
  }
}

function isPast(event: CommunityEvent): boolean {
  return new Date(event.endsAt).getTime() < now().getTime()
}

function isFull(event: CommunityEvent): boolean {
  return event.capacity !== undefined && event.attendeeIds.length >= event.capacity
}

export function toEventView(db: Database, event: CommunityEvent, viewer: User | null): EventView {
  return {
    ...withoutKey(event, 'attendeeIds'),
    organizerView: organizerView(db, event),
    category: categoryOf(db, event),
    neighborhoodName: neighborhoodName(db, event.neighborhoodId),
    attendeeCount: event.attendeeIds.length,
    attendingByMe: viewer ? event.attendeeIds.includes(viewer.id) : false,
    isPast: isPast(event),
    isFull: isFull(event),
    isMine: viewer?.id === event.createdBy,
    canManage: can(viewer, 'event:manage', { ownerId: event.createdBy }),
    attendeesPreview: event.attendeeIds
      .filter((userId) => db.users.some((candidate) => candidate.id === userId))
      .slice(0, PREVIEW_SIZE)
      .map((userId) => profileOf(db, userId)),
  }
}

// ── Validação dos campos ─────────────────────────────────────────────────────

function parseDate(value: unknown, field: string, label: string): string {
  const time = typeof value === 'string' ? Date.parse(value) : Number.NaN
  if (!Number.isFinite(time)) fail(field, `Informe ${label} do evento.`)
  return new Date(time).toISOString()
}

function validateCategory(db: Database, value: unknown): ID {
  const category = db.categories.find(
    (candidate) => candidate.id === value && candidate.kind === 'event' && candidate.active,
  )
  if (!category) fail('categoryId', 'Escolha uma categoria válida para o evento.')
  return category.id
}

function validateNeighborhood(db: Database, value: unknown): ID {
  const neighborhood = db.neighborhoods.find((candidate) => candidate.id === value)
  if (!neighborhood) fail('neighborhoodId', 'Escolha um bairro válido.')
  return neighborhood.id
}

function validateCapacity(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    fail('capacity', 'O limite de vagas deve ser um número inteiro maior que zero.')
  }
  return value
}

function validateIllustration(value: unknown): IllustrationKey | undefined {
  return typeof value === 'string' && value !== '' ? (value as IllustrationKey) : undefined
}

function resolveOrganizer(
  db: Database,
  user: User,
  organizerAs: EventInput['organizerAs'],
): EventOrganizer {
  const mode = organizerAs ?? 'self'
  if (mode === 'self') return { kind: 'user', id: user.id, name: user.name }
  if (mode === 'institution') {
    const institution = requireVerifiedInstitution(db, user)
    return { kind: 'institution', id: institution.id, name: institution.name }
  }
  if (mode === 'business') {
    const business =
      user.role === 'merchant' && user.businessId
        ? db.businesses.find((candidate) => candidate.id === user.businessId)
        : undefined
    if (!business) {
      throw forbiddenError(
        'Somente comerciantes com estabelecimento cadastrado podem organizar eventos em nome de um negócio.',
      )
    }
    return { kind: 'business', id: business.id, name: business.name }
  }
  fail('organizerAs', 'Escolha em nome de quem organizar o evento.')
}

const TITLE_RULE = {
  field: 'title',
  label: 'O título',
  min: 5,
  max: config.limits.eventTitleMaxLength,
}
const DESCRIPTION_RULE = {
  field: 'description',
  label: 'O texto da descrição',
  min: 10,
  max: config.limits.eventDescriptionMaxLength,
}
const VENUE_RULE = { field: 'venue', label: 'O nome do local', min: 2, max: 80 }
const ADDRESS_RULE = { field: 'address', label: 'O endereço', max: config.limits.addressMaxLength }

function assertDates(startsAt: string, endsAt: string, requireFutureStart: boolean): void {
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    fail('endsAt', 'O término do evento deve ser depois do início.')
  }
  if (requireFutureStart && new Date(startsAt).getTime() <= now().getTime()) {
    fail('startsAt', 'O início do evento precisa ser no futuro.')
  }
}

function sortEvents(rows: CommunityEvent[]): CommunityEvent[] {
  const upcoming = rows
    .filter((event) => !isPast(event))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = rows
    .filter((event) => isPast(event))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  return [...upcoming, ...past]
}

export function createEventsRepository(ctx: LocalContext): EventsRepository {
  return {
    async list(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const when = filters.when ?? 'upcoming'
        const showCancelled =
          filters.includeCancelled === true ||
          (filters.createdBy !== undefined && filters.createdBy === user.id)
        const rows = db.events.filter((event) => {
          if (event.status === 'cancelled' && !showCancelled) return false
          if (when === 'upcoming' && isPast(event)) return false
          if (when === 'past' && !isPast(event)) return false
          if (filters.categoryId !== undefined && event.categoryId !== filters.categoryId)
            return false
          if (filters.attendeeId !== undefined && !event.attendeeIds.includes(filters.attendeeId)) {
            return false
          }
          if (filters.createdBy !== undefined && event.createdBy !== filters.createdBy) return false
          return matchesSearch(
            filters.search,
            event.title,
            event.description,
            event.venue,
            event.address,
            organizerView(db, event).name,
            categoryOf(db, event).name,
          )
        })
        return sortEvents(rows).map((event) => toEventView(db, event, user))
      })
    },

    async get(id) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const event = db.events.find((candidate) => candidate.id === id)
        return event ? toEventView(db, event, user) : null
      })
    },

    async create(input) {
      await ctx.latency()
      return ctx.store.write(['events', 'posts'], (db) => {
        const user = requirePermission(db, 'event:create')
        const title = requireText(input.title, TITLE_RULE)
        const description = requireText(input.description, DESCRIPTION_RULE)
        const categoryId = validateCategory(db, input.categoryId)
        const startsAt = parseDate(input.startsAt, 'startsAt', 'o início')
        const endsAt = parseDate(input.endsAt, 'endsAt', 'o término')
        assertDates(startsAt, endsAt, true)
        const venue = requireText(input.venue, VENUE_RULE)
        const address = optionalText(input.address, ADDRESS_RULE)
        const neighborhoodId = validateNeighborhood(db, input.neighborhoodId)
        const location = optionalGeoPoint(input.location, 'location')
        const capacity = validateCapacity(input.capacity)
        const imageUrl = optionalImage(input.imageUrl, 'imageUrl')
        const illustration = validateIllustration(input.illustration)
        const organizer = resolveOrganizer(db, user, input.organizerAs)

        const event: CommunityEvent = {
          id: createId('evt'),
          title,
          description,
          categoryId,
          startsAt,
          endsAt,
          venue,
          neighborhoodId,
          organizer,
          attendeeIds: [],
          status: 'scheduled',
          createdBy: user.id,
          createdAt: nowISO(),
        }
        if (illustration) event.illustration = illustration
        if (imageUrl) event.imageUrl = imageUrl
        if (address) event.address = address
        if (location) event.location = location
        if (capacity !== undefined) event.capacity = capacity
        db.events.push(event)

        if (input.shareOnFeed !== false) {
          insertPost(db, {
            authorId: user.id,
            category: 'event',
            content: `Venha participar: "${title}" — ${formatDateTime(startsAt)}, em ${venue}.`,
            neighborhoodId,
            imageUrl,
            illustration,
            institutionId: organizer.kind === 'institution' ? organizer.id : undefined,
            businessId: organizer.kind === 'business' ? organizer.id : undefined,
            linkedEventId: event.id,
          })
        }
        return toEventView(db, event, user)
      })
    },

    async update(id, patch) {
      await ctx.latency()
      return ctx.store.write(['events'], (db) => {
        const user = requireUser(db)
        const event = requireRecord(db.events, id, EVENT_NOT_FOUND)
        if (!can(user, 'event:manage', { ownerId: event.createdBy })) {
          throw forbiddenError('Somente quem criou o evento ou a administração podem editá-lo.')
        }
        if (event.status === 'cancelled') {
          throw conflictError('Eventos cancelados não podem ser editados.')
        }

        const next: CommunityEvent = structuredClone(event)
        if (patch.title !== undefined) next.title = requireText(patch.title, TITLE_RULE)
        if (patch.description !== undefined) {
          next.description = requireText(patch.description, DESCRIPTION_RULE)
        }
        if (patch.categoryId !== undefined) next.categoryId = validateCategory(db, patch.categoryId)
        if (patch.startsAt !== undefined) {
          next.startsAt = parseDate(patch.startsAt, 'startsAt', 'o início')
        }
        if (patch.endsAt !== undefined) next.endsAt = parseDate(patch.endsAt, 'endsAt', 'o término')
        if (patch.startsAt !== undefined || patch.endsAt !== undefined) {
          assertDates(next.startsAt, next.endsAt, next.startsAt !== event.startsAt)
        }
        if (patch.venue !== undefined) next.venue = requireText(patch.venue, VENUE_RULE)
        if (patch.address !== undefined) {
          const address = optionalText(patch.address, ADDRESS_RULE)
          if (address) next.address = address
          else delete next.address
        }
        if (patch.neighborhoodId !== undefined) {
          next.neighborhoodId = validateNeighborhood(db, patch.neighborhoodId)
        }
        if (patch.location !== undefined) {
          const location = optionalGeoPoint(patch.location, 'location')
          if (location) next.location = location
          else delete next.location
        }
        if (patch.capacity !== undefined) {
          const capacity = validateCapacity(patch.capacity)
          if (capacity !== undefined && capacity < event.attendeeIds.length) {
            fail(
              'capacity',
              `O limite de vagas não pode ser menor que as ${event.attendeeIds.length} presenças já confirmadas.`,
            )
          }
          if (capacity === undefined) delete next.capacity
          else next.capacity = capacity
        }
        if (patch.imageUrl !== undefined) {
          const imageUrl = optionalImage(patch.imageUrl, 'imageUrl')
          if (imageUrl) next.imageUrl = imageUrl
          else delete next.imageUrl
        }
        if (patch.illustration !== undefined) {
          const illustration = validateIllustration(patch.illustration)
          if (illustration) next.illustration = illustration
          else delete next.illustration
        }
        if (patch.organizerAs !== undefined) {
          next.organizer = resolveOrganizer(db, user, patch.organizerAs)
        }

        const index = db.events.findIndex((candidate) => candidate.id === event.id)
        db.events[index] = next
        return toEventView(db, next, user)
      })
    },

    async cancel(id) {
      await ctx.latency()
      return ctx.store.write(['events', 'notifications'], (db) => {
        const user = requireUser(db)
        const event = requireRecord(db.events, id, EVENT_NOT_FOUND)
        if (!can(user, 'event:manage', { ownerId: event.createdBy })) {
          throw forbiddenError('Somente quem criou o evento ou a administração podem cancelá-lo.')
        }
        if (event.status === 'cancelled') throw conflictError('Este evento já foi cancelado.')
        if (isPast(event)) throw conflictError('Este evento já foi realizado.')

        event.status = 'cancelled'
        for (const attendeeId of event.attendeeIds) {
          pushNotification(
            db,
            {
              userId: attendeeId,
              category: 'events',
              title: 'Evento cancelado',
              body: `O evento "${event.title}" foi cancelado pela organização.`,
              link: paths.event(event.id),
            },
            user.id,
          )
        }
        return toEventView(db, event, user)
      })
    },

    async remove(id) {
      await ctx.latency()
      ctx.store.write(['events', 'posts', 'comments', 'reports'], (db) => {
        requirePermission(db, 'event:delete')
        const event = requireRecord(db.events, id, EVENT_NOT_FOUND)
        deletePosts(
          db,
          new Set(
            db.posts.filter((post) => post.linkedEventId === event.id).map((post) => post.id),
          ),
        )
        db.events = db.events.filter((candidate) => candidate.id !== event.id)
      })
    },

    async toggleAttendance(id) {
      await ctx.latency()
      return ctx.store.write(['events', 'notifications'], (db) => {
        const user = requirePermission(db, 'event:attend')
        const event = requireRecord(db.events, id, EVENT_NOT_FOUND)
        if (event.status === 'cancelled') throw conflictError('Este evento foi cancelado.')
        if (isPast(event)) throw conflictError('Este evento já foi realizado.')

        if (event.attendeeIds.includes(user.id)) {
          event.attendeeIds = event.attendeeIds.filter((attendeeId) => attendeeId !== user.id)
        } else {
          if (isFull(event)) throw conflictError('Este evento está lotado.')
          event.attendeeIds = [...event.attendeeIds, user.id]
          pushNotification(
            db,
            {
              userId: event.createdBy,
              category: 'events',
              title: 'Nova presença confirmada',
              body: `${user.name} confirmou presença em "${event.title}".`,
              link: paths.event(event.id),
            },
            user.id,
          )
        }
        return toEventView(db, event, user)
      })
    },
  }
}
