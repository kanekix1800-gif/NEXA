import { paths } from '@/app/paths'
import { config } from '@/config'
import { can } from '@/services/permissions'
import { canTransition, formatProtocol, isOpenStatus } from '@/services/demands/status'
import {
  DEMAND_STATUS_LABEL,
  URGENCY_LABEL,
  type Category,
  type Demand,
  type DemandActorKind,
  type DemandHistoryEntry,
  type DemandStatus,
  type DemandView,
  type Database,
  type ID,
  type Urgency,
  type User,
} from '@/types'
import { now, nowISO } from '@/utils/clock'
import { conflictError, forbiddenError, validationError } from '@/utils/errors'
import { createId } from '@/utils/id'
import { matchesSearch, pluralize, truncate } from '@/utils/text'

import type { DemandsRepository } from '../contracts'
import {
  imageList,
  nearestNeighborhoodId,
  neighborhoodName,
  optionalGeoPoint,
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
import {
  deleteComments,
  deleteCommentsOf,
  deletePosts,
  insertComment,
  insertPost,
  institutionAccounts,
  listCommentViews,
  toCommentView,
  visibleCommentCount,
  withoutKey,
} from './posts.shared'

const DEMAND_NOT_FOUND = 'Demanda não encontrada.'

/** Categoria exibida quando a categoria original da demanda foi excluída. */
const FALLBACK_CATEGORY: Category = {
  id: 'cat_removida',
  kind: 'demand',
  name: 'Outros',
  icon: 'more',
  color: 'gray',
  active: false,
  system: false,
  order: 999,
}

const URGENCY_WEIGHT: Record<Urgency, number> = { high: 3, medium: 2, low: 1 }

const MESSAGE_RULE = { field: 'message', label: 'O texto da atualização', min: 5, max: 400 }

function isDemandStatus(value: unknown): value is DemandStatus {
  return typeof value === 'string' && Object.hasOwn(DEMAND_STATUS_LABEL, value)
}

function isUrgency(value: unknown): value is Urgency {
  return typeof value === 'string' && Object.hasOwn(URGENCY_LABEL, value)
}

function categoryOf(db: Database, demand: Demand): Category {
  return (
    db.categories.find((category) => category.id === demand.categoryId) ?? {
      ...FALLBACK_CATEGORY,
      id: demand.categoryId,
    }
  )
}

/**
 * Pode gerenciar o status institucional: administração, ou conta da instituição
 * responsável — desde que a instituição esteja verificada.
 */
function canManageDemand(db: Database, viewer: User | null, demand: Demand): boolean {
  if (!viewer || !can(viewer, 'demand:manage', { institutionId: demand.institutionId }))
    return false
  if (viewer.role !== 'institution') return true
  return db.institutions.some(
    (institution) => institution.id === viewer.institutionId && institution.verified,
  )
}

export function toDemandView(db: Database, demand: Demand, viewer: User | null): DemandView {
  const institution = demand.institutionId
    ? db.institutions.find((candidate) => candidate.id === demand.institutionId)
    : undefined
  return {
    ...withoutKey(demand, 'supporterIds'),
    history: [...demand.history].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    author: profileOf(db, demand.authorId),
    category: categoryOf(db, demand),
    neighborhoodName: neighborhoodName(db, demand.neighborhoodId),
    institution: institution
      ? {
          id: institution.id,
          name: institution.name,
          icon: institution.icon,
          color: institution.color,
        }
      : undefined,
    supportCount: demand.supporterIds.length,
    supportedByMe: viewer ? demand.supporterIds.includes(viewer.id) : false,
    commentCount: visibleCommentCount(db, 'demand', demand.id),
    isMine: viewer?.id === demand.authorId,
    canManage: canManageDemand(db, viewer, demand),
    canClose: can(viewer, 'demand:close', {
      ownerId: demand.authorId,
      isOpen: isOpenStatus(demand.status),
    }),
  }
}

/** Identifica quem atualiza a demanda como gestor (administração ou instituição responsável verificada). */
function requireManager(
  db: Database,
  user: User,
  demand: Demand,
): { kind: Extract<DemandActorKind, 'admin' | 'institution'>; name: string } {
  if (user.role === 'admin') return { kind: 'admin', name: 'Equipe NEXA' }
  if (
    user.role === 'institution' &&
    user.institutionId !== undefined &&
    user.institutionId === demand.institutionId
  ) {
    const institution = requireVerifiedInstitution(db, user)
    return { kind: 'institution', name: institution.name }
  }
  throw forbiddenError(
    'Somente a instituição responsável ou a administração podem atualizar esta demanda.',
  )
}

function addHistory(demand: Demand, entry: Omit<DemandHistoryEntry, 'id' | 'createdAt'>): void {
  const createdAt = nowISO()
  demand.history.push({ id: createId('dhi'), createdAt, ...entry })
  demand.updatedAt = createdAt
}

/** Notifica autor e apoiadores sobre uma atualização (exceto quem fez a ação). */
function notifyFollowers(db: Database, demand: Demand, actorId: ID): void {
  const body = `${demand.title}: ${DEMAND_STATUS_LABEL[demand.status]}`
  const link = paths.demand(demand.id)
  pushNotification(
    db,
    {
      userId: demand.authorId,
      category: 'demands',
      title: 'Sua demanda recebeu uma nova atualização.',
      body,
      link,
    },
    actorId,
  )
  for (const supporterId of new Set(demand.supporterIds)) {
    if (supporterId === demand.authorId) continue
    pushNotification(
      db,
      {
        userId: supporterId,
        category: 'demands',
        title: 'Uma demanda que você apoia foi atualizada.',
        body,
        link,
      },
      actorId,
    )
  }
}

function notifyInstitution(db: Database, demand: Demand, institutionId: ID, actorId: ID): void {
  for (const account of institutionAccounts(db, institutionId)) {
    pushNotification(
      db,
      {
        userId: account.id,
        category: 'institutions',
        title: 'Nova demanda encaminhada',
        body: `${demand.title} (protocolo ${demand.protocol})`,
        link: paths.demand(demand.id),
      },
      actorId,
    )
  }
}

function compareRecent(a: Demand, b: Demand): number {
  return b.createdAt.localeCompare(a.createdAt)
}

export function createDemandsRepository(ctx: LocalContext): DemandsRepository {
  return {
    async list(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const status = filters.status ?? 'all'
        const sort = filters.sort ?? 'recent'
        const rows = db.demands.filter((demand) => {
          if (status === 'open' && !isOpenStatus(demand.status)) return false
          if (status !== 'open' && status !== 'all' && demand.status !== status) return false
          if (filters.categoryId !== undefined && demand.categoryId !== filters.categoryId)
            return false
          if (filters.authorId !== undefined && demand.authorId !== filters.authorId) return false
          if (
            filters.supportedBy !== undefined &&
            !demand.supporterIds.includes(filters.supportedBy)
          ) {
            return false
          }
          if (
            filters.institutionId !== undefined &&
            demand.institutionId !== filters.institutionId
          ) {
            return false
          }
          if (
            filters.neighborhoodId !== undefined &&
            demand.neighborhoodId !== filters.neighborhoodId
          ) {
            return false
          }
          return matchesSearch(
            filters.search,
            demand.title,
            demand.description,
            demand.protocol,
            categoryOf(db, demand).name,
            demand.addressHint,
            neighborhoodName(db, demand.neighborhoodId),
          )
        })

        rows.sort((a, b) => {
          if (sort === 'supported') {
            return b.supporterIds.length - a.supporterIds.length || compareRecent(a, b)
          }
          if (sort === 'urgent') {
            return (
              URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency] ||
              b.supporterIds.length - a.supporterIds.length ||
              compareRecent(a, b)
            )
          }
          return compareRecent(a, b)
        })
        return rows.map((demand) => toDemandView(db, demand, user))
      })
    },

    async get(id) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const demand = db.demands.find((candidate) => candidate.id === id)
        return demand ? toDemandView(db, demand, user) : null
      })
    },

    async create(input) {
      await ctx.latency()
      return ctx.store.write(['demands', 'posts', 'notifications'], (db) => {
        const user = requirePermission(db, 'demand:create')
        const category = db.categories.find(
          (candidate) =>
            candidate.id === input.categoryId && candidate.kind === 'demand' && candidate.active,
        )
        if (!category) {
          const message = 'Escolha uma categoria válida para a demanda.'
          throw validationError(message, { categoryId: message })
        }
        const title = requireText(input.title, {
          field: 'title',
          label: 'O título',
          min: 5,
          max: config.limits.demandTitleMaxLength,
        })
        const description = requireText(input.description, {
          field: 'description',
          label: 'O texto da descrição',
          min: 10,
          max: config.limits.demandDescriptionMaxLength,
        })
        const photos = imageList(input.photos, 'photos', config.limits.demandMaxPhotos)
        const location = optionalGeoPoint(input.location, 'location')
        const addressHint = optionalText(input.addressHint, {
          field: 'addressHint',
          label: 'A referência do local',
          max: 120,
        })
        if (!isUrgency(input.urgency)) {
          const message = 'Escolha o grau de urgência.'
          throw validationError(message, { urgency: message })
        }

        let neighborhoodId: ID
        if (input.neighborhoodId !== undefined && input.neighborhoodId !== '') {
          if (!db.neighborhoods.some((neighborhood) => neighborhood.id === input.neighborhoodId)) {
            const message = 'Escolha um bairro válido.'
            throw validationError(message, { neighborhoodId: message })
          }
          neighborhoodId = input.neighborhoodId
        } else {
          neighborhoodId =
            (location ? nearestNeighborhoodId(db, location) : undefined) ?? user.neighborhoodId
        }

        db.meta.demandSequence += 1
        const protocol = formatProtocol(now().getFullYear(), db.meta.demandSequence)
        const institution = category.defaultInstitutionId
          ? db.institutions.find((candidate) => candidate.id === category.defaultInstitutionId)
          : undefined
        const createdAt = nowISO()

        const history: DemandHistoryEntry[] = [
          {
            id: createId('dhi'),
            createdAt,
            actorId: user.id,
            actorKind: 'citizen',
            actorName: user.name,
            status: 'registered',
            message: 'Demanda registrada.',
            simulated: false,
          },
        ]
        if (institution) {
          history.push({
            id: createId('dhi'),
            createdAt,
            actorKind: 'system',
            actorName: 'NEXA',
            message: `Encaminhamento sugerido para ${institution.name} (simulação: não há integração oficial com o órgão).`,
            simulated: true,
          })
        }

        const demand: Demand = {
          id: createId('dem'),
          protocol,
          authorId: user.id,
          categoryId: category.id,
          title,
          description,
          photos,
          location,
          neighborhoodId,
          urgency: input.urgency,
          status: 'registered',
          supporterIds: [],
          history,
          createdAt,
          updatedAt: createdAt,
        }
        if (addressHint) demand.addressHint = addressHint
        if (institution) demand.institutionId = institution.id
        if (input.aiSuggestion && typeof input.aiSuggestion === 'object') {
          demand.aiSuggestion = structuredClone(input.aiSuggestion)
        }
        db.demands.push(demand)

        if (input.shareOnFeed !== false) {
          insertPost(db, {
            authorId: user.id,
            category: 'demand',
            content: `Registrei uma demanda: ${title}`,
            neighborhoodId,
            imageUrl: photos[0],
            linkedDemandId: demand.id,
          })
        }
        if (institution) notifyInstitution(db, demand, institution.id, user.id)

        return toDemandView(db, demand, user)
      })
    },

    async toggleSupport(id) {
      await ctx.latency()
      return ctx.store.write(['demands', 'notifications'], (db) => {
        const user = requireUser(db)
        const demand = requireRecord(db.demands, id, DEMAND_NOT_FOUND)
        if (!can(user, 'demand:support', { ownerId: demand.authorId })) {
          throw conflictError('Você é o autor desta demanda.')
        }
        if (demand.supporterIds.includes(user.id)) {
          demand.supporterIds = demand.supporterIds.filter((supporterId) => supporterId !== user.id)
        } else {
          if (demand.status === 'closed') {
            throw conflictError('Esta demanda foi encerrada e não recebe novos apoios.')
          }
          demand.supporterIds = [...demand.supporterIds, user.id]
          pushNotification(
            db,
            {
              userId: demand.authorId,
              category: 'demands',
              title: 'Sua demanda recebeu um novo apoio.',
              body: `${demand.title} agora tem ${pluralize(demand.supporterIds.length, 'apoio', 'apoios')}.`,
              link: paths.demand(demand.id),
            },
            user.id,
          )
        }
        return toDemandView(db, demand, user)
      })
    },

    async updateStatus(id, input) {
      await ctx.latency()
      return ctx.store.write(['demands', 'notifications'], (db) => {
        const user = requireUser(db)
        const demand = requireRecord(db.demands, id, DEMAND_NOT_FOUND)
        if (!isDemandStatus(input.status)) {
          const message = 'Escolha um status válido.'
          throw validationError(message, { status: message })
        }

        let actorKind: DemandActorKind
        let actorName: string
        let message: string
        const isManager =
          user.role === 'admin' ||
          (user.role === 'institution' &&
            user.institutionId !== undefined &&
            user.institutionId === demand.institutionId)

        if (isManager) {
          const manager = requireManager(db, user, demand)
          if (!canTransition(demand.status, input.status)) {
            throw conflictError('Mudança de status não permitida.')
          }
          message = requireText(input.message, MESSAGE_RULE)
          actorKind = manager.kind
          actorName = manager.name
        } else if (demand.authorId === user.id) {
          if (input.status !== 'closed') {
            throw forbiddenError('Você pode apenas encerrar a sua demanda.')
          }
          if (!isOpenStatus(demand.status)) {
            throw conflictError('Esta demanda não está mais em aberto.')
          }
          message =
            optionalText(input.message, { field: 'message', label: 'A mensagem', max: 400 }) ??
            'Encerrada pelo morador.'
          actorKind = 'citizen'
          actorName = user.name
        } else {
          throw forbiddenError(
            'Somente a instituição responsável ou a administração podem alterar o status desta demanda.',
          )
        }

        demand.status = input.status
        addHistory(demand, {
          actorId: user.id,
          actorKind,
          actorName,
          status: input.status,
          message,
          simulated: config.isDemoMode && actorKind !== 'citizen',
        })
        notifyFollowers(db, demand, user.id)
        return toDemandView(db, demand, user)
      })
    },

    async postUpdate(id, text) {
      await ctx.latency()
      return ctx.store.write(['demands', 'notifications'], (db) => {
        const user = requireUser(db)
        const demand = requireRecord(db.demands, id, DEMAND_NOT_FOUND)
        const manager = requireManager(db, user, demand)
        const message = requireText(text, MESSAGE_RULE)
        addHistory(demand, {
          actorId: user.id,
          actorKind: manager.kind,
          actorName: manager.name,
          message,
          simulated: config.isDemoMode,
        })
        notifyFollowers(db, demand, user.id)
        return toDemandView(db, demand, user)
      })
    },

    async assignInstitution(id, institutionId) {
      await ctx.latency()
      return ctx.store.write(['demands', 'notifications'], (db) => {
        const admin = requirePermission(db, 'demand:assign')
        const demand = requireRecord(db.demands, id, DEMAND_NOT_FOUND)
        if (institutionId === null) {
          if (demand.institutionId !== undefined) {
            delete demand.institutionId
            addHistory(demand, {
              actorKind: 'system',
              actorName: 'NEXA',
              message: 'A indicação de instituição responsável foi removida pela administração.',
              simulated: false,
            })
          }
          return toDemandView(db, demand, admin)
        }
        const institution = requireRecord(
          db.institutions,
          institutionId,
          'Instituição não encontrada.',
        )
        if (demand.institutionId !== institution.id) {
          demand.institutionId = institution.id
          addHistory(demand, {
            actorKind: 'system',
            actorName: 'NEXA',
            message: `Encaminhamento para ${institution.name} definido pela administração (simulação: não há integração oficial com o órgão).`,
            simulated: config.isDemoMode,
          })
          notifyInstitution(db, demand, institution.id, admin.id)
        }
        return toDemandView(db, demand, admin)
      })
    },

    async listComments(demandId) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const demand = requireRecord(db.demands, demandId, DEMAND_NOT_FOUND)
        return listCommentViews(db, 'demand', demand.id, user)
      })
    },

    async addComment(demandId, content) {
      await ctx.latency()
      return ctx.store.write(['comments', 'notifications'], (db) => {
        const user = requireUser(db)
        const demand = requireRecord(db.demands, demandId, DEMAND_NOT_FOUND)
        const text = requireText(content, {
          field: 'content',
          label: 'O comentário',
          max: config.limits.commentMaxLength,
        })
        const comment = insertComment(db, 'demand', demand.id, user.id, text)
        pushNotification(
          db,
          {
            userId: demand.authorId,
            category: 'demands',
            title: 'Novo comentário na sua demanda',
            body: `${user.name} comentou: ${truncate(text, 80)}`,
            link: paths.demand(demand.id),
          },
          user.id,
        )
        return toCommentView(db, comment, user)
      })
    },

    async removeComment(commentId) {
      await ctx.latency()
      ctx.store.write(['comments', 'reports'], (db) => {
        const user = requireUser(db)
        const comment = requireRecord(db.comments, commentId, 'Comentário não encontrado.')
        if (!can(user, 'comment:delete', { ownerId: comment.authorId })) {
          throw forbiddenError('Somente o autor ou a administração podem excluir este comentário.')
        }
        deleteComments(db, new Set([comment.id]))
      })
    },

    async remove(id) {
      await ctx.latency()
      ctx.store.write(['demands', 'comments', 'posts', 'reports'], (db) => {
        requirePermission(db, 'demand:delete')
        const demand = requireRecord(db.demands, id, DEMAND_NOT_FOUND)
        deleteCommentsOf(db, 'demand', demand.id)
        deletePosts(
          db,
          new Set(
            db.posts.filter((post) => post.linkedDemandId === demand.id).map((post) => post.id),
          ),
        )
        db.demands = db.demands.filter((candidate) => candidate.id !== demand.id)
      })
    },
  }
}
