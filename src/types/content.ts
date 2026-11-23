import type { ColorKey, GeoPoint, ID, ISODate, IconKey, IllustrationKey } from './common'
import type { DemandStatus } from './demands'

// ── Notificações ──

export type NotificationCategory =
  'community' | 'demands' | 'events' | 'commerce' | 'institutions' | 'system'

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  community: 'Comunidade',
  demands: 'Demandas',
  events: 'Eventos',
  commerce: 'Comércio',
  institutions: 'Instituições',
  system: 'Sistema',
}

export interface AppNotification {
  id: ID
  /** Destinatário. */
  userId: ID
  category: NotificationCategory
  title: string
  body: string
  /** Rota interna do conteúdo relacionado (ex.: "/demandas/dem-01"). */
  link?: string
  read: boolean
  createdAt: ISODate
}

// ── Notícias da região (conteúdo demonstrativo) ──

export interface NewsArticle {
  id: ID
  title: string
  summary: string
  /** Parágrafos do texto. */
  body: string[]
  /** Editoria curta (ex.: "Mobilidade", "Saúde"). */
  tag: string
  illustration: IllustrationKey
  neighborhoodId?: ID
  publishedAt: ISODate
  /** Origem exibida (ex.: "Redação NEXA · conteúdo demonstrativo"). */
  source: string
  linkedEventId?: ID
}

// ── Mapa inteligente ──

export type MapLayer = 'demands' | 'businesses' | 'institutions' | 'events' | 'services'

export const MAP_LAYER_LABEL: Record<MapLayer, string> = {
  demands: 'Problemas',
  businesses: 'Comércio',
  institutions: 'Instituições',
  events: 'Eventos',
  services: 'Serviços',
}

/** Ponto exibido no mapa, já normalizado a partir das entidades do sistema. */
export interface MapPoint {
  /** Identificador único do ponto: `${layer}:${refId}`. */
  id: string
  layer: MapLayer
  /** ID da entidade de origem. */
  refId: ID
  title: string
  /** Rótulo da categoria (ex.: "Buraco na rua", "Alimentação"). */
  categoryLabel: string
  description: string
  /** Endereço ou referência textual. */
  addressLabel: string
  location: GeoPoint
  icon: IconKey
  color: ColorKey
  /** Rota de detalhes da entidade. */
  to: string
  /** Somente demandas. */
  demandStatus?: DemandStatus
  /** Informação curta complementar (ex.: "12 apoios", "Aberto agora", "25 nov, 9h"). */
  meta?: string
}

// ── Indicadores ──

/** Resumo comunitário da tela inicial — sempre calculado a partir dos dados do sistema. */
export interface CommunitySummary {
  demandsRegistered: number
  demandsResolved: number
  demandsOpen: number
  businesses: number
  upcomingEvents: number
  residents: number
  posts: number
}

export interface NamedCount {
  key: string
  label: string
  count: number
  color?: ColorKey
}

export interface TimeBucket {
  /** Início do período (ISO). */
  date: ISODate
  /** Rótulo curto para o eixo (ex.: "03/11" ou "Sem 45"). */
  label: string
  value: number
}

/** Visão geral do painel administrativo. */
export interface AdminOverview {
  users: number
  usersByRole: NamedCount[]
  businesses: number
  institutions: number
  demandsOpen: number
  demandsResolved: number
  demandsTotal: number
  posts: number
  events: number
  openReports: number
  demandsByStatus: NamedCount[]
  demandsByCategory: NamedCount[]
  demandsByNeighborhood: NamedCount[]
  /** Demandas registradas por semana (últimas 8 semanas). */
  demandsPerWeek: TimeBucket[]
  /** Publicações por semana (últimas 8 semanas). */
  postsPerWeek: TimeBucket[]
}

/** Indicadores do painel institucional (demandas encaminhadas à instituição). */
export interface InstitutionPanelSummary {
  total: number
  byStatus: NamedCount[]
  byCategory: NamedCount[]
  byNeighborhood: NamedCount[]
  /** Tempo médio, em dias, entre o registro e a resolução (ou `null` sem dados). */
  averageResolutionDays: number | null
  totalSupports: number
}

// ── Planos (conteúdo estático) ──

export interface Plan {
  id: 'community' | 'business_free' | 'business_premium' | 'institutional'
  name: string
  audience: string
  /** Texto de preço. Usar "Gratuito" ou "Preço a definir" — nunca valores inventados. */
  priceLabel: string
  description: string
  features: string[]
  highlight?: boolean
  icon: IconKey
  illustration?: IllustrationKey
}

/** Ponto de referência usado para calcular distâncias. */
export interface ReferencePoint {
  location: GeoPoint
  /** `neighborhood` = centro aproximado do bairro; `device` = geolocalização consentida (arredondada). */
  source: 'neighborhood' | 'device'
  label: string
}
