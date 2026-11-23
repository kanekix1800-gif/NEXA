import type { ColorKey, GeoPoint, ID, ISODate, IconKey, IllustrationKey } from './common'
import type { PublicProfile } from './user'

/** Tipos de categoria gerenciáveis pela administração. */
export type CategoryKind = 'demand' | 'business' | 'event'

/** Categoria (de demanda, de comércio ou de evento). */
export interface Category {
  id: ID
  kind: CategoryKind
  name: string
  description?: string
  icon: IconKey
  color: ColorKey
  /** Categorias inativas não aparecem em novos cadastros, mas continuam nos registros antigos. */
  active: boolean
  /** Categorias de sistema não podem ser excluídas (apenas desativadas/renomeadas). */
  system: boolean
  order: number
  /** Somente demandas: instituição sugerida como possível responsável. */
  defaultInstitutionId?: ID
}

/** Ciclo de vida de uma demanda comunitária. */
export type DemandStatus = 'registered' | 'in_review' | 'in_progress' | 'resolved' | 'closed'

export const DEMAND_STATUS_LABEL: Record<DemandStatus, string> = {
  registered: 'Registrada',
  in_review: 'Em análise',
  in_progress: 'Em andamento',
  resolved: 'Resolvida',
  closed: 'Encerrada',
}

/** Ordem natural dos status (usada em linhas do tempo e filtros). */
export const DEMAND_STATUS_ORDER: DemandStatus[] = [
  'registered',
  'in_review',
  'in_progress',
  'resolved',
  'closed',
]

/** Status considerados "em aberto". */
export const OPEN_DEMAND_STATUSES: DemandStatus[] = ['registered', 'in_review', 'in_progress']

export type Urgency = 'low' | 'medium' | 'high'

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

/** Quem originou uma entrada do histórico. */
export type DemandActorKind = 'citizen' | 'institution' | 'admin' | 'system'

/** Entrada do histórico de uma demanda (registro, mudança de status ou atualização). */
export interface DemandHistoryEntry {
  id: ID
  createdAt: ISODate
  actorId?: ID
  actorKind: DemandActorKind
  /** Nome exibido de quem atualizou (pessoa, instituição ou "NEXA"). */
  actorName: string
  /** Novo status, quando a entrada representa uma mudança de status. */
  status?: DemandStatus
  message: string
  /**
   * `true` quando a atualização institucional é SIMULADA (modo demonstração, sem
   * integração real com o órgão). A interface deve sinalizar isso claramente.
   */
  simulated: boolean
}

/**
 * Sugestões geradas pela NEXA IA para uma demanda.
 * São apenas sugestões: nunca alteram a demanda automaticamente.
 */
export interface DemandAISuggestion {
  categoryId?: ID
  /** Confiança da sugestão de categoria (0 a 1). */
  categoryConfidence?: number
  summary?: string
  urgency?: Urgency
  /** Motivos, em linguagem simples, para a prioridade sugerida. */
  urgencyReasons?: string[]
  /** Instituições possivelmente responsáveis. */
  institutionIds?: ID[]
  /** Demandas parecidas já registradas (possíveis duplicatas). */
  duplicateIds?: ID[]
  /** `demo` = regras determinísticas locais; `live` = provedor de IA configurado. */
  mode: 'demo' | 'live'
  generatedAt: ISODate
}

/** Demanda comunitária registrada por um morador. */
export interface Demand {
  id: ID
  /** Código legível de acompanhamento, ex.: "NX-2026-0013". */
  protocol: string
  authorId: ID
  categoryId: ID
  title: string
  description: string
  /** Fotos enviadas (data URLs já comprimidas). */
  photos: string[]
  /** Ilustração de capa usada quando não há foto (dados demonstrativos). */
  illustration?: IllustrationKey
  /** Local APROXIMADO do problema. `null` quando não informado. */
  location: GeoPoint | null
  /** Referência textual informada pelo morador (ex.: "próximo à praça"). */
  addressHint?: string
  neighborhoodId: ID
  /** Grau de urgência sugerido pelo morador. */
  urgency: Urgency
  aiSuggestion?: DemandAISuggestion
  status: DemandStatus
  /** Instituição indicada como possível responsável (encaminhamento demonstrativo). */
  institutionId?: ID
  /** IDs dos moradores que apoiaram a demanda. */
  supporterIds: ID[]
  history: DemandHistoryEntry[]
  createdAt: ISODate
  updatedAt: ISODate
}

// ── Modelos de visualização ──

/** A lista de apoiadores não é exposta: a interface recebe apenas contagem e estado do usuário. */
export interface DemandView extends Omit<Demand, 'supporterIds'> {
  author: PublicProfile
  category: Category
  neighborhoodName: string
  institution?: { id: ID; name: string; icon: IconKey; color: ColorKey }
  supportCount: number
  supportedByMe: boolean
  commentCount: number
  isMine: boolean
  /** O usuário atual pode alterar o status institucional (instituição responsável ou administração). */
  canManage: boolean
  /** O usuário atual pode encerrar a demanda (autor, enquanto ela estiver em aberto). */
  canClose: boolean
}
