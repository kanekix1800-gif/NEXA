import { paths } from '@/app/paths'
import { DEMAND_STATUS_COLOR } from '@/components/icons/colors'
import { config } from '@/config'
import { isOpenStatus } from '@/services/demands/status'
import {
  DEMAND_STATUS_LABEL,
  DEMAND_STATUS_ORDER,
  INSTITUTION_CATEGORY_LABEL,
  PUBLIC_SERVICE_KIND_LABEL,
  type ColorKey,
  type Database,
  type GeoPoint,
  type ID,
  type IllustrationKey,
  type Initiative,
  type InitiativeView,
  type Institution,
  type InstitutionPanelSummary,
  type InstitutionView,
  type NamedCount,
  type PublicService,
  type PublicServiceView,
  type User,
} from '@/types'
import { nowISO } from '@/utils/clock'
import { forbiddenError, validationError } from '@/utils/errors'
import { distanceMeters } from '@/utils/geo'
import { createId } from '@/utils/id'
import { matchesSearch, truncate } from '@/utils/text'

import type { InstitutionsRepository, InstitutionUpdateInput } from '../contracts'
import {
  neighborhoodName,
  optionalImage,
  optionalText,
  pushNotification,
  referencePoint,
  requireEmail,
  requirePermission,
  requireRecord,
  requireText,
  requireUser,
  requireVerifiedInstitution,
  type LocalContext,
} from './context'
import { deletePosts, institutionAccounts, insertPost, isAdmin } from './posts.shared'

const INSTITUTION_NOT_FOUND = 'Instituição não encontrada.'
const INITIATIVE_NOT_FOUND = 'Iniciativa não encontrada.'
const DAY_MS = 24 * 60 * 60 * 1000

const PALETTE: ColorKey[] = [
  'green',
  'teal',
  'blue',
  'purple',
  'orange',
  'pink',
  'gold',
  'terracotta',
]

const INITIATIVE_TITLE_RULE = { field: 'title', label: 'O título', min: 5, max: 90 }
const INITIATIVE_DESCRIPTION_RULE = {
  field: 'description',
  label: 'O texto da descrição',
  min: 10,
  max: 1200,
}

function isMyInstitution(viewer: User | null, institutionId: ID): boolean {
  return viewer?.role === 'institution' && viewer.institutionId === institutionId
}

function canSeeInstitution(institution: Institution, viewer: User | null): boolean {
  return institution.verified || isAdmin(viewer) || isMyInstitution(viewer, institution.id)
}

export function toInstitutionView(
  db: Database,
  institution: Institution,
  viewer: User | null,
): InstitutionView {
  const demands = db.demands.filter((demand) => demand.institutionId === institution.id)
  return {
    ...institution,
    neighborhoodName: institution.neighborhoodId
      ? neighborhoodName(db, institution.neighborhoodId)
      : undefined,
    demandCount: demands.length,
    openDemandCount: demands.filter((demand) => isOpenStatus(demand.status)).length,
    initiativeCount: db.initiatives.filter(
      (initiative) => initiative.institutionId === institution.id,
    ).length,
    isMine: isMyInstitution(viewer, institution.id),
  }
}

function toInitiativeView(
  db: Database,
  initiative: Initiative,
  viewer: User | null,
): InitiativeView {
  const institution = db.institutions.find((candidate) => candidate.id === initiative.institutionId)
  return {
    ...initiative,
    institutionName: institution?.name ?? 'Instituição',
    institutionIcon: institution?.icon ?? 'landmark',
    institutionColor: institution?.color ?? 'green',
    isMine: isMyInstitution(viewer, initiative.institutionId),
  }
}

function toServiceView(
  db: Database,
  service: PublicService,
  viewer: User | null,
  near?: GeoPoint,
): PublicServiceView {
  const reference = referencePoint(db, viewer, near)
  const institution = service.institutionId
    ? db.institutions.find((candidate) => candidate.id === service.institutionId)
    : undefined
  return {
    ...service,
    neighborhoodName: neighborhoodName(db, service.neighborhoodId),
    institutionName: institution?.name,
    distanceMeters: Math.round(distanceMeters(reference, service.location)),
  }
}

/** Lista de textos curtos (áreas, serviços): sem vazios nem repetidos. */
function textList(value: unknown, field: string, label: string): string[] {
  if (!Array.isArray(value)) {
    const message = `${label}: envie uma lista de textos.`
    throw validationError(message, { [field]: message })
  }
  const items = [
    ...new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item !== ''),
    ),
  ]
  if (items.length > 12 || items.some((item) => item.length > 60)) {
    const message = `${label}: informe até 12 itens com no máximo 60 caracteres cada.`
    throw validationError(message, { [field]: message })
  }
  return items
}

function applyUpdate(institution: Institution, patch: InstitutionUpdateInput): void {
  if (patch.tagline !== undefined) {
    institution.tagline = requireText(patch.tagline, {
      field: 'tagline',
      label: 'O slogan',
      min: 2,
      max: 80,
    })
  }
  if (patch.description !== undefined) {
    institution.description = requireText(patch.description, {
      field: 'description',
      label: 'O texto da descrição',
      min: 10,
      max: 1200,
    })
  }
  if (patch.areas !== undefined)
    institution.areas = textList(patch.areas, 'areas', 'Áreas de atuação')
  if (patch.services !== undefined) {
    institution.services = textList(patch.services, 'services', 'Serviços oferecidos')
  }
  if (patch.phone !== undefined) {
    institution.phone = optionalText(patch.phone, { field: 'phone', label: 'O telefone', max: 30 })
  }
  if (patch.email !== undefined) {
    const raw = typeof patch.email === 'string' ? patch.email.trim() : ''
    institution.email = raw === '' ? undefined : requireEmail(raw)
  }
  if (patch.website !== undefined) {
    institution.website = optionalText(patch.website, {
      field: 'website',
      label: 'O site',
      max: 120,
    })
  }
  if (patch.address !== undefined) {
    institution.address = optionalText(patch.address, {
      field: 'address',
      label: 'O endereço',
      max: config.limits.addressMaxLength,
    })
  }
}

function countBy<T>(
  rows: T[],
  keyOf: (row: T) => string,
  describe: (key: string, index: number) => { label: string; color?: ColorKey },
): NamedCount[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = keyOf(row)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count], index) => ({ key, count, ...describe(key, index) }))
}

function panelSummary(db: Database, institutionId: ID): InstitutionPanelSummary {
  const demands = db.demands.filter((demand) => demand.institutionId === institutionId)

  const resolutionDays: number[] = []
  for (const demand of demands) {
    const resolved = demand.history
      .filter((entry) => entry.status === 'resolved')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!resolved) continue
    const days =
      (new Date(resolved.createdAt).getTime() - new Date(demand.createdAt).getTime()) / DAY_MS
    resolutionDays.push(Math.max(0, days))
  }
  const averageResolutionDays =
    resolutionDays.length === 0
      ? null
      : Math.round(
          (resolutionDays.reduce((sum, days) => sum + days, 0) / resolutionDays.length) * 10,
        ) / 10

  return {
    total: demands.length,
    byStatus: DEMAND_STATUS_ORDER.map((status) => ({
      key: status,
      label: DEMAND_STATUS_LABEL[status],
      count: demands.filter((demand) => demand.status === status).length,
      color: DEMAND_STATUS_COLOR[status],
    })),
    byCategory: countBy(
      demands,
      (demand) => demand.categoryId,
      (key) => {
        const category = db.categories.find((candidate) => candidate.id === key)
        return { label: category?.name ?? 'Outros', color: category?.color ?? 'gray' }
      },
    ),
    byNeighborhood: countBy(
      demands,
      (demand) => demand.neighborhoodId,
      (key, index) => ({
        label: neighborhoodName(db, key) || 'Bairro não informado',
        color: PALETTE[index % PALETTE.length],
      }),
    ),
    averageResolutionDays,
    totalSupports: demands.reduce((sum, demand) => sum + demand.supporterIds.length, 0),
  }
}

export function createInstitutionsRepository(ctx: LocalContext): InstitutionsRepository {
  return {
    async list(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const includeUnverified = filters.includeUnverified === true && isAdmin(user)
        const category = filters.category ?? 'all'
        return db.institutions
          .filter((institution) => {
            if (!institution.verified && !includeUnverified) return false
            if (category !== 'all' && institution.category !== category) return false
            return matchesSearch(
              filters.search,
              institution.name,
              institution.tagline,
              institution.description,
              INSTITUTION_CATEGORY_LABEL[institution.category],
              institution.areas.join(' '),
              institution.services.join(' '),
            )
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          .map((institution) => toInstitutionView(db, institution, user))
      })
    },

    async get(id) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const institution = db.institutions.find((candidate) => candidate.id === id)
        if (!institution || !canSeeInstitution(institution, user)) return null
        return toInstitutionView(db, institution, user)
      })
    },

    async getMine() {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        if (user.role !== 'institution' || !user.institutionId) return null
        const institution = db.institutions.find((candidate) => candidate.id === user.institutionId)
        return institution ? toInstitutionView(db, institution, user) : null
      })
    },

    async update(id, patch) {
      await ctx.latency()
      return ctx.store.write(['institutions'], (db) => {
        const user = requirePermission(db, 'institution:edit', { institutionId: id })
        const institution = requireRecord(db.institutions, id, INSTITUTION_NOT_FOUND)
        applyUpdate(institution, patch)
        return toInstitutionView(db, institution, user)
      })
    },

    async setVerified(id, verified) {
      await ctx.latency()
      return ctx.store.write(['institutions', 'notifications'], (db) => {
        const admin = requirePermission(db, 'institution:verify')
        const institution = requireRecord(db.institutions, id, INSTITUTION_NOT_FOUND)
        const changed = institution.verified !== verified
        institution.verified = verified
        if (changed) {
          for (const account of institutionAccounts(db, institution.id)) {
            pushNotification(
              db,
              {
                userId: account.id,
                category: 'institutions',
                title: verified ? 'Instituição verificada' : 'Verificação da instituição suspensa',
                body: verified
                  ? `${institution.name} foi verificada pela administração do NEXA e já aparece no diretório público.`
                  : `${institution.name} saiu do diretório público até uma nova verificação da administração do NEXA.`,
                link: verified ? paths.institution(institution.id) : paths.institutionPanel,
              },
              admin.id,
            )
          }
        }
        return toInstitutionView(db, institution, admin)
      })
    },

    async listInitiatives(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        return db.initiatives
          .filter((initiative) => {
            if (
              filters.institutionId !== undefined &&
              initiative.institutionId !== filters.institutionId
            ) {
              return false
            }
            const institution = db.institutions.find(
              (candidate) => candidate.id === initiative.institutionId,
            )
            return institution ? canSeeInstitution(institution, user) : isAdmin(user)
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((initiative) => toInitiativeView(db, initiative, user))
      })
    },

    async publishInitiative(input) {
      await ctx.latency()
      return ctx.store.write(['initiatives', 'posts'], (db) => {
        const user = requireUser(db)
        const institution = requireVerifiedInstitution(db, user)
        const title = requireText(input.title, INITIATIVE_TITLE_RULE)
        const description = requireText(input.description, INITIATIVE_DESCRIPTION_RULE)
        const imageUrl = optionalImage(input.imageUrl, 'imageUrl')
        const illustration: IllustrationKey | undefined =
          typeof input.illustration === 'string' && input.illustration.length > 0
            ? input.illustration
            : undefined

        const initiative: Initiative = {
          id: createId('ini'),
          institutionId: institution.id,
          title,
          description,
          status: 'active',
          createdBy: user.id,
          createdAt: nowISO(),
        }
        if (illustration) initiative.illustration = illustration
        if (imageUrl) initiative.imageUrl = imageUrl

        if (input.shareOnFeed !== false) {
          const post = insertPost(db, {
            authorId: user.id,
            category: 'social',
            content: truncate(`${title} — ${description}`, config.limits.postMaxLength),
            neighborhoodId: institution.neighborhoodId ?? user.neighborhoodId,
            imageUrl,
            illustration,
            institutionId: institution.id,
          })
          initiative.postId = post.id
        }
        db.initiatives.push(initiative)
        return toInitiativeView(db, initiative, user)
      })
    },

    async updateInitiative(id, patch) {
      await ctx.latency()
      return ctx.store.write(['initiatives'], (db) => {
        const user = requireUser(db)
        const initiative = requireRecord(db.initiatives, id, INITIATIVE_NOT_FOUND)
        requirePermission(db, 'initiative:manage', { institutionId: initiative.institutionId })
        if (patch.title !== undefined)
          initiative.title = requireText(patch.title, INITIATIVE_TITLE_RULE)
        if (patch.description !== undefined) {
          initiative.description = requireText(patch.description, INITIATIVE_DESCRIPTION_RULE)
        }
        if (patch.status !== undefined) {
          if (patch.status !== 'active' && patch.status !== 'finished') {
            const message = 'Situação da iniciativa inválida.'
            throw validationError(message, { status: message })
          }
          initiative.status = patch.status
        }
        return toInitiativeView(db, initiative, user)
      })
    },

    async removeInitiative(id) {
      await ctx.latency()
      ctx.store.write(['initiatives', 'posts', 'comments', 'reports'], (db) => {
        requireUser(db)
        const initiative = requireRecord(db.initiatives, id, INITIATIVE_NOT_FOUND)
        requirePermission(db, 'initiative:manage', { institutionId: initiative.institutionId })
        if (initiative.postId) deletePosts(db, new Set([initiative.postId]))
        db.initiatives = db.initiatives.filter((candidate) => candidate.id !== initiative.id)
      })
    },

    async getPanelSummary(institutionId) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        let targetId: ID
        if (user.role === 'admin') {
          if (!institutionId) throw validationError('Informe a instituição do painel.')
          targetId = institutionId
        } else if (user.role === 'institution' && user.institutionId) {
          if (institutionId !== undefined && institutionId !== user.institutionId) {
            throw forbiddenError('Você só pode ver o painel da sua instituição.')
          }
          targetId = user.institutionId
        } else {
          throw forbiddenError('O painel institucional é exclusivo de contas institucionais.')
        }
        requireRecord(db.institutions, targetId, INSTITUTION_NOT_FOUND)
        return panelSummary(db, targetId)
      })
    },

    async listServices(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const kind = filters.kind ?? 'all'
        return db.publicServices
          .filter((service) => {
            if (kind !== 'all' && service.kind !== kind) return false
            if (
              filters.institutionId !== undefined &&
              service.institutionId !== filters.institutionId
            ) {
              return false
            }
            return matchesSearch(
              filters.search,
              service.name,
              service.description,
              service.address,
              PUBLIC_SERVICE_KIND_LABEL[service.kind],
              neighborhoodName(db, service.neighborhoodId),
            )
          })
          .map((service) => toServiceView(db, service, user, filters.near))
          .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      })
    },

    async getService(id) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const service = db.publicServices.find((candidate) => candidate.id === id)
        return service ? toServiceView(db, service, user) : null
      })
    },
  }
}
