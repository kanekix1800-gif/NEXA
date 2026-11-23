import type { Category, DemandAISuggestion, DemandView, GeoPoint, ID, Urgency } from '@/types'
import { nowISO } from '@/utils/clock'
import { distanceMeters } from '@/utils/geo'
import { normalizeText, truncate } from '@/utils/text'

/**
 * NEXA IA — apoio ao registro de demandas (modo demonstrativo)
 * ─────────────────────────────────────────────────────────────────────────────
 * Regras determinísticas que sugerem categoria, resumo, prioridade, possíveis
 * duplicatas e órgãos responsáveis. São apenas SUGESTÕES: quem decide é o morador.
 */

/** Palavras que indicam cada categoria (pelo ícone da categoria, estável entre renomeações). */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  pothole: ['buraco', 'asfalto', 'cratera', 'pavimento', 'calcada quebrada', 'rua esburacada'],
  trash: ['lixo', 'entulho', 'sujeira', 'coleta', 'descarte', 'mato alto', 'terreno baldio'],
  lightbulb: ['luz', 'iluminacao', 'poste', 'lampada', 'escuro', 'escuridao', 'apagado'],
  bus: ['onibus', 'transporte', 'ponto de onibus', 'linha', 'atraso', 'terminal', 'lotacao'],
  accessibility: [
    'rampa',
    'acessibilidade',
    'cadeirante',
    'cadeira de rodas',
    'piso tatil',
    'degrau',
  ],
  droplets: ['agua', 'vazamento', 'esgoto', 'bueiro', 'alagamento', 'saneamento', 'entupido'],
  alert: ['risco', 'muro', 'queda', 'fiacao', 'fio solto', 'ponte', 'semaforo', 'arvore caindo'],
}

const HIGH_URGENCY = [
  'risco',
  'perigo',
  'acidente',
  'crianca',
  'idoso',
  'escola',
  'hospital',
  'urgente',
  'queda',
  'fio solto',
  'alagamento',
  'esgoto a ceu aberto',
  'ferido',
]
const LOW_URGENCY = ['estetica', 'pintura', 'sugestao', 'melhoria', 'quando possivel']

export interface DemandDraft {
  title: string
  description: string
  categoryId?: ID
  location?: GeoPoint | null
}

export interface DemandAssistantData {
  categories: Category[]
  /** Demandas em aberto já registradas (para apontar possíveis duplicatas). */
  openDemands: DemandView[]
}

function tokens(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3),
  )
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const word of a) if (b.has(word)) shared += 1
  return shared / Math.min(a.size, b.size)
}

/** Gera as sugestões para o rascunho de uma demanda. */
export function suggestForDemand(
  draft: DemandDraft,
  data: DemandAssistantData,
): DemandAISuggestion {
  const text = normalizeText(`${draft.title} ${draft.description}`)

  // Categoria: a que tiver mais palavras-chave presentes no texto.
  let best: { category: Category; hits: number } | undefined
  for (const category of data.categories) {
    const hits = (CATEGORY_KEYWORDS[category.icon] ?? []).filter((word) =>
      text.includes(word),
    ).length
    if (hits > 0 && (!best || hits > best.hits)) best = { category, hits }
  }
  const suggestedCategory = best?.category
  const effectiveCategoryId = draft.categoryId ?? suggestedCategory?.id

  // Prioridade: palavras de risco, com os motivos explicados.
  const reasons: string[] = []
  const risky = HIGH_URGENCY.filter((word) => text.includes(word))
  let urgency: Urgency = 'medium'
  if (risky.length > 0) {
    urgency = 'high'
    reasons.push(`O relato menciona ${risky.slice(0, 3).join(', ')}, o que indica risco a pessoas.`)
  } else if (LOW_URGENCY.some((word) => text.includes(word))) {
    urgency = 'low'
    reasons.push('O relato descreve uma melhoria, sem risco imediato.')
  } else {
    reasons.push('Não identificamos sinais de risco imediato no relato.')
  }

  // Possíveis duplicatas: mesma categoria e local próximo, ou títulos muito parecidos.
  const draftTokens = tokens(`${draft.title} ${draft.description}`)
  const duplicates = data.openDemands
    .map((demand) => {
      const sameCategory =
        effectiveCategoryId !== undefined && demand.categoryId === effectiveCategoryId
      const near =
        draft.location && demand.location
          ? distanceMeters(draft.location, demand.location) <= 250
          : false
      const alike = similarity(draftTokens, tokens(`${demand.title} ${demand.description}`))
      const score = (sameCategory && near ? 0.6 : 0) + alike
      return { demand, score }
    })
    .filter((entry) => entry.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  if (duplicates.length > 0) {
    reasons.push('Há demandas parecidas já registradas: apoiar uma delas fortalece o pedido.')
  }

  const category = data.categories.find((item) => item.id === effectiveCategoryId)
  const firstSentence = draft.description.trim().split(/(?<=[.!?])\s+/)[0] ?? ''

  return {
    categoryId: suggestedCategory?.id,
    categoryConfidence: best ? Math.min(0.95, 0.55 + best.hits * 0.15) : undefined,
    summary: firstSentence ? truncate(firstSentence, 140) : undefined,
    urgency,
    urgencyReasons: reasons,
    institutionIds: category?.defaultInstitutionId ? [category.defaultInstitutionId] : [],
    duplicateIds: duplicates.map((entry) => entry.demand.id),
    mode: 'demo',
    generatedAt: nowISO(),
  }
}
