import { config } from '@/config'
import { can, type Permission, type PermissionResource } from '@/services/permissions'
import {
  ACCESSIBILITY_FEATURES,
  type AccessibilityFeature,
  type AppNotification,
  type Database,
  type GeoPoint,
  type ID,
  type Institution,
  type NotificationCategory,
  type PublicProfile,
  type User,
  type UserSettings,
} from '@/types'
import { nowISO } from '@/utils/clock'
import {
  forbiddenError,
  notFoundError,
  unauthenticatedError,
  validationError,
} from '@/utils/errors'
import { approximatePoint, distanceMeters, isValidGeoPoint, isWithinDemoArea } from '@/utils/geo'
import { createId } from '@/utils/id'
import { isImageDataUrl } from '@/utils/image'

import { readSession } from './session'
import { simulateLatency, type LocalStore } from './store'

/**
 * NÚCLEO COMPARTILHADO DOS REPOSITÓRIOS LOCAIS
 * ─────────────────────────────────────────────────────────────────────────────
 * Funções usadas por todos os repositórios locais: sessão/usuário atual,
 * permissões, perfis públicos, notificações e validação de entradas.
 *
 * Padrão de implementação de um método de repositório:
 *
 *   async toggleLike(id) {
 *     await ctx.latency()
 *     return ctx.store.write(['posts'], (db) => {
 *       const user = requireUser(db)
 *       const post = requireRecord(db.posts, id, 'Publicação não encontrada.')
 *       ...alterações em db...
 *       return toPostView(db, post, user)   // o store devolve uma CÓPIA
 *     })
 *   }
 *
 * Consultas usam `ctx.store.read((db) => ...)`. Nunca guarde referências ao `db`
 * fora dos callbacks e declare em `write` TODAS as coleções que serão alteradas
 * (inclusive `notifications` quando houver `pushNotification`).
 */
export interface LocalContext {
  store: LocalStore
  /** Simula a latência de rede (zero em testes). */
  latency(factor?: number): Promise<void>
}

export function createLocalContext(store: LocalStore): LocalContext {
  return {
    store,
    latency: (factor) => simulateLatency(factor),
  }
}

// ── Sessão, usuário atual e permissões ───────────────────────────────────────

/** Usuário da sessão atual, ou `null` (sem sessão, conta removida ou suspensa). */
export function currentUser(db: Database): User | null {
  const session = readSession()
  if (!session) return null
  const user = db.users.find((candidate) => candidate.id === session.userId)
  if (!user || user.status !== 'active') return null
  return user
}

/** Exige um usuário autenticado e ativo. */
export function requireUser(db: Database): User {
  const user = currentUser(db)
  if (!user) throw unauthenticatedError()
  return user
}

/** Exige um usuário autenticado com a permissão indicada (ver `services/permissions.ts`). */
export function requirePermission(
  db: Database,
  permission: Permission,
  resource?: PermissionResource,
  message?: string,
): User {
  const user = requireUser(db)
  if (!can(user, permission, resource)) throw forbiddenError(message)
  return user
}

/**
 * Exige que o usuário represente uma instituição VERIFICADA pela administração.
 * Usada ao publicar em nome da instituição, divulgar iniciativas, organizar eventos
 * institucionais e atualizar o status de demandas.
 */
export function requireVerifiedInstitution(db: Database, user: User): Institution {
  const institution =
    user.role === 'institution' && user.institutionId
      ? db.institutions.find((candidate) => candidate.id === user.institutionId)
      : undefined
  if (!institution) {
    throw forbiddenError('Esta ação é exclusiva de contas institucionais.')
  }
  if (!institution.verified) {
    throw forbiddenError(
      'Sua instituição ainda aguarda verificação da administração do NEXA para realizar esta ação.',
    )
  }
  return institution
}

// ── Registros e perfis ───────────────────────────────────────────────────────

/** Localiza um registro pelo ID ou lança `not_found`. */
export function requireRecord<T extends { id: ID }>(rows: T[], id: ID, message?: string): T {
  const row = rows.find((candidate) => candidate.id === id)
  if (!row) throw notFoundError(message)
  return row
}

export function neighborhoodName(db: Database, id: ID | undefined): string {
  if (!id) return ''
  return db.neighborhoods.find((neighborhood) => neighborhood.id === id)?.name ?? ''
}

/**
 * Bairro cujo ponto de referência é o mais próximo da coordenada informada.
 * Fora da área de demonstração devolve `undefined` (vale o bairro do usuário).
 */
export function nearestNeighborhoodId(db: Database, point: GeoPoint): ID | undefined {
  if (!isWithinDemoArea(point)) return undefined
  let best: { id: ID; distance: number } | undefined
  for (const neighborhood of db.neighborhoods) {
    const distance = distanceMeters(point, neighborhood.center)
    if (!best || distance < best.distance) best = { id: neighborhood.id, distance }
  }
  return best?.id
}

/**
 * Perfil público: somente o que outras pessoas podem ver.
 * NUNCA inclui e-mail, situação da conta ou outros dados privados.
 */
export function toPublicProfile(db: Database, user: User): PublicProfile {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    neighborhoodId: user.neighborhoodId,
    neighborhoodName: neighborhoodName(db, user.neighborhoodId),
    bio: user.bio,
    avatar: user.avatar,
    photoUrl: user.photoUrl,
  }
}

/** Perfil exibido no lugar de contas que foram excluídas. */
export const REMOVED_USER_PROFILE: PublicProfile = {
  id: 'usr_removed',
  name: 'Pessoa que saiu do NEXA',
  username: 'conta_removida',
  role: 'resident',
  neighborhoodId: '',
  neighborhoodName: '',
  avatar: { skin: 'medium', hair: 'bald', hairColor: 'gray', top: 'cream', background: 'sand' },
}

/** Perfil público de um usuário pelo ID (ou o perfil "conta removida"). */
export function profileOf(db: Database, userId: ID): PublicProfile {
  const user = db.users.find((candidate) => candidate.id === userId)
  return user ? toPublicProfile(db, user) : { ...REMOVED_USER_PROFILE }
}

/**
 * Ponto de referência para cálculo de distâncias: o ponto informado (geolocalização
 * consentida) quando está DENTRO da área de demonstração, ou o centro APROXIMADO do
 * bairro do usuário, ou o centro do mapa. Assim, quem abre o app longe da cidade de
 * demonstração nunca vê distâncias absurdas.
 */
export function referencePoint(db: Database, user: User | null, near?: GeoPoint): GeoPoint {
  if (near && isValidGeoPoint(near) && isWithinDemoArea(near)) return approximatePoint(near, 3)
  const neighborhood = user
    ? db.neighborhoods.find((candidate) => candidate.id === user.neighborhoodId)
    : undefined
  return neighborhood?.center ?? config.map.center
}

// ── Preferências e notificações ──────────────────────────────────────────────

export function defaultSettings(userId: ID, updatedAt: string = nowISO()): UserSettings {
  return {
    userId,
    locationConsent: 'unset',
    motion: 'system',
    notifications: {
      community: true,
      demands: true,
      events: true,
      commerce: true,
      institutions: true,
      system: true,
    },
    updatedAt,
  }
}

/** Preferências do usuário (ou as preferências padrão, se ainda não gravadas). */
export function settingsOf(db: Database, userId: ID): UserSettings {
  return db.userSettings.find((settings) => settings.userId === userId) ?? defaultSettings(userId)
}

export interface NotifyInput {
  /** Destinatário. */
  userId: ID
  category: NotificationCategory
  title: string
  body: string
  /** Rota interna do conteúdo relacionado — use sempre `paths` de `@/app/paths`. */
  link?: string
}

/**
 * Cria uma notificação para o destinatário, respeitando suas preferências.
 * Deve ser chamada dentro de `store.write([... , 'notifications'], ...)`.
 *
 * Não notifica quando: o destinatário não existe, desativou a categoria, ou é o
 * próprio autor da ação (`actorId`). Devolve a notificação criada ou `null`.
 */
export function pushNotification(
  db: Database,
  input: NotifyInput,
  actorId?: ID,
): AppNotification | null {
  if (actorId !== undefined && actorId === input.userId) return null
  const recipient = db.users.find((candidate) => candidate.id === input.userId)
  if (!recipient) return null
  if (!settingsOf(db, recipient.id).notifications[input.category]) return null

  const notification: AppNotification = {
    id: createId('ntf'),
    userId: input.userId,
    category: input.category,
    title: input.title,
    body: input.body,
    link: input.link,
    read: false,
    createdAt: nowISO(),
  }
  db.notifications.push(notification)
  return notification
}

// ── Validação de entradas ────────────────────────────────────────────────────

export interface TextRule {
  /** Nome do campo no formulário (chave de `fieldErrors`). */
  field: string
  /** Rótulo em português usado na mensagem (ex.: "O título"). */
  label: string
  min?: number
  max: number
}

/** Valida um texto obrigatório e devolve o valor sem espaços nas pontas. */
export function requireText(value: unknown, rule: TextRule): string {
  const text = typeof value === 'string' ? value.trim() : ''
  const min = rule.min ?? 1
  if (text.length < min) {
    const message =
      text.length === 0
        ? `${rule.label} é obrigatório.`
        : `${rule.label} deve ter pelo menos ${min} caracteres.`
    throw validationError(message, { [rule.field]: message })
  }
  if (text.length > rule.max) {
    const message = `${rule.label} deve ter no máximo ${rule.max} caracteres.`
    throw validationError(message, { [rule.field]: message })
  }
  return text
}

/** Valida um texto opcional; vazio vira `undefined`. */
export function optionalText(value: unknown, rule: Omit<TextRule, 'min'>): string | undefined {
  if (value === undefined || value === null) return undefined
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return undefined
  if (text.length > rule.max) {
    const message = `${rule.label} deve ter no máximo ${rule.max} caracteres.`
    throw validationError(message, { [rule.field]: message })
  }
  return text
}

/** Valida uma imagem opcional enviada como data URL. */
export function optionalImage(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (!isImageDataUrl(value)) {
    const message = 'A imagem enviada é inválida. Tente outro arquivo.'
    throw validationError(message, { [field]: message })
  }
  return value
}

/** Valida uma lista de imagens (data URLs) com limite de quantidade. */
export function imageList(value: unknown, field: string, max: number): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((item) => !isImageDataUrl(item))) {
    const message = 'Uma das imagens enviadas é inválida. Tente outro arquivo.'
    throw validationError(message, { [field]: message })
  }
  if (value.length > max) {
    const message = `Envie no máximo ${max} ${max === 1 ? 'imagem' : 'imagens'}.`
    throw validationError(message, { [field]: message })
  }
  return value as string[]
}

function assertInsideDemoArea(point: GeoPoint, field: string): void {
  if (!isWithinDemoArea(point)) {
    const message =
      'Este ponto está fora da área de demonstração. Selecione um local dentro da cidade no mapa.'
    throw validationError(message, { [field]: message })
  }
}

/**
 * Valida uma coordenada obrigatória: precisa ser válida e estar dentro da área de
 * demonstração. Devolve o ponto com precisão reduzida (4 casas ≈ 11 m).
 */
export function requireGeoPoint(value: unknown, field: string, label: string): GeoPoint {
  if (!isValidGeoPoint(value)) {
    const message = `${label} é obrigatória. Selecione um ponto no mapa.`
    throw validationError(message, { [field]: message })
  }
  assertInsideDemoArea(value, field)
  return approximatePoint(value, 4)
}

/** Valida uma coordenada opcional (`null`/`undefined` = não informada). Mesmas regras de `requireGeoPoint`. */
export function optionalGeoPoint(value: unknown, field: string): GeoPoint | null {
  if (value === undefined || value === null) return null
  if (!isValidGeoPoint(value)) {
    const message = 'A localização informada é inválida.'
    throw validationError(message, { [field]: message })
  }
  assertInsideDemoArea(value, field)
  return approximatePoint(value, 4)
}

/**
 * Valida a lista de recursos de acessibilidade de um local: só aceita recursos
 * conhecidos, remove repetições e devolve na ordem padrão de exibição.
 */
export function accessibilityFeatures(
  value: unknown,
  field = 'accessibility',
): AccessibilityFeature[] {
  if (value === undefined || value === null) return []
  if (
    !Array.isArray(value) ||
    value.some((item) => !ACCESSIBILITY_FEATURES.includes(item as AccessibilityFeature))
  ) {
    const message = 'Selecione recursos de acessibilidade válidos.'
    throw validationError(message, { [field]: message })
  }
  return ACCESSIBILITY_FEATURES.filter((feature) => value.includes(feature))
}

/** Valida um e-mail e o devolve normalizado (minúsculas, sem espaços). */
export function requireEmail(value: unknown, field = 'email'): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    const message = 'Informe um e-mail válido.'
    throw validationError(message, { [field]: message })
  }
  return email
}
