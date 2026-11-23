import type { ID, ISODate, IconKey } from './common'

/** `demo` = respostas determinísticas locais; `live` = provedor de IA configurado no backend. */
export type AIMode = 'demo' | 'live'

/** Ação de navegação sugerida pela assistente (leva a um recurso do app). */
export interface AIAction {
  label: string
  /** Rota interna. */
  to: string
  icon?: IconKey
}

/** Referência a um registro existente na plataforma, citado na resposta. */
export interface AIReference {
  kind: 'business' | 'event' | 'demand' | 'institution' | 'service' | 'news' | 'product'
  id: ID
  title: string
  subtitle?: string
  /** Rota interna de detalhes. */
  to: string
}

export interface AIMessage {
  id: ID
  role: 'user' | 'assistant'
  content: string
  createdAt: ISODate
  /** Somente respostas da assistente. */
  mode?: AIMode
  actions?: AIAction[]
  references?: AIReference[]
  /** A resposta representa uma falha (exibida com opção de tentar novamente). */
  error?: boolean
}

/** Histórico de conversa com a NEXA IA (um por usuário). */
export interface AIConversation {
  userId: ID
  messages: AIMessage[]
  updatedAt: ISODate
}

/** Sugestão rápida exibida no chat. */
export interface AIQuickPrompt {
  id: string
  label: string
  /** Texto enviado como pergunta. */
  prompt: string
  icon: IconKey
  /** Restringe a sugestão a determinados perfis (ausente = todos). */
  roles?: Array<'resident' | 'merchant' | 'institution' | 'admin'>
}

export type BusinessInsightKind =
  | 'top_product'
  | 'low_stock'
  | 'out_of_stock'
  | 'expenses_trend'
  | 'revenue_trend'
  | 'restock'
  | 'best_day'
  | 'average_ticket'
  | 'payment_mix'
  | 'margin'
  | 'no_data'

/**
 * Recomendação da NEXA IA Empresarial.
 * Sempre derivada dos dados reais do estabelecimento — nunca de valores inventados.
 */
export interface BusinessInsight {
  id: string
  kind: BusinessInsightKind
  tone: 'positive' | 'warning' | 'neutral'
  title: string
  description: string
  /** Valor em destaque já formatado (ex.: "R$ 1.240,00", "3 itens"). */
  metric?: string
  action?: AIAction
}
