import { paths } from '@/app/paths'
import { config } from '@/config'
import { repos } from '@/repositories'
import { computeBusinessSummary } from '@/services/business/metrics'
import {
  ACCESS_POINT_KIND_LABEL,
  DEMAND_STATUS_LABEL,
  FLEET_ACCESSIBILITY_LABEL,
  OPEN_DEMAND_STATUSES,
  PUBLIC_SERVICE_KIND_LABEL,
  type AIAction,
  type AIMessage,
  type AIMode,
  type AIQuickPrompt,
  type AIReference,
  type User,
} from '@/types'
import { nowISO } from '@/utils/clock'
import { formatEventTimeRange, formatWeekdayDate, rangeForPreset } from '@/utils/dates'
import { formatChange, formatCurrency, formatDistance, formatRating } from '@/utils/format'
import { createId } from '@/utils/id'
import { firstName, normalizeText, pluralize } from '@/utils/text'

import { buildBusinessInsights } from './businessInsights'

/**
 * NEXA IA — ASSISTENTE
 * ─────────────────────────────────────────────────────────────────────────────
 * Dois modos, escolhidos por configuração:
 *  • `demo` (padrão): motor determinístico que entende a intenção da pergunta e
 *    responde consultando os dados JÁ AUTORIZADOS para o usuário (os mesmos
 *    repositórios da interface — nunca dados privados de terceiros).
 *  • `live`: quando `VITE_AI_API_URL` aponta para o backend da NEXA IA, a pergunta
 *    segue para lá com um contexto controlado. A chave do provedor fica somente no
 *    servidor. Se o backend falhar, a resposta volta ao modo demonstrativo.
 */

export const AI_MODE: AIMode = config.ai.apiUrl ? 'live' : 'demo'

export const AI_GREETING = 'Olá, eu sou a NEXA IA! 👋 Como posso te ajudar hoje?'

export const QUICK_PROMPTS: AIQuickPrompt[] = [
  {
    id: 'services',
    label: 'Encontrar serviços públicos',
    prompt: 'Quais serviços públicos existem perto de mim?',
    icon: 'landmark',
  },
  {
    id: 'commerce',
    label: 'Sugerir comércios perto de mim',
    prompt: 'Sugira comércios perto de mim.',
    icon: 'store',
  },
  {
    id: 'rights',
    label: 'Tirar dúvidas sobre direitos',
    prompt: 'Quais são os meus direitos como consumidor?',
    icon: 'shield',
  },
  {
    id: 'demand',
    label: 'Registrar uma demanda',
    prompt: 'Como registro uma demanda?',
    icon: 'megaphone',
  },
  {
    id: 'events',
    label: 'Encontrar eventos',
    prompt: 'Quais são os próximos eventos?',
    icon: 'calendar',
  },
  {
    id: 'accessibility',
    label: 'Ônibus acessíveis e barreiras',
    prompt: 'Quais ônibus acessíveis passam perto de mim?',
    icon: 'accessibility',
  },
  {
    id: 'business',
    label: 'Ajudar meu negócio',
    prompt: 'Como está o meu negócio?',
    icon: 'chart',
    roles: ['merchant'],
  },
]

export function quickPromptsFor(user: User): AIQuickPrompt[] {
  return QUICK_PROMPTS.filter((item) => !item.roles || item.roles.includes(user.role))
}

interface Reply {
  content: string
  actions?: AIAction[]
  references?: AIReference[]
}

type Intent =
  | 'greeting'
  | 'services'
  | 'commerce'
  | 'rights'
  | 'demand'
  | 'events'
  | 'problems'
  | 'business'
  | 'transit'
  | 'barriers'
  | 'app'
  | 'unknown'

const INTENT_KEYWORDS: Array<[Intent, string[]]> = [
  [
    'business',
    [
      'meu negocio',
      'minha loja',
      'minhas vendas',
      'faturamento',
      'estoque',
      'lucro',
      'despesa',
      'vender mais',
      'meu estabelecimento',
      'gestao',
    ],
  ],
  [
    'demand',
    [
      'registrar',
      'registro',
      'como registro',
      'reportar',
      'reclamar',
      'abrir demanda',
      'nova demanda',
      'denunciar problema',
    ],
  ],
  [
    'problems',
    [
      'problemas',
      'resumo',
      'resuma',
      'situacao do bairro',
      'demandas abertas',
      'o que esta acontecendo',
      'principais demandas',
    ],
  ],
  [
    'services',
    [
      'servico publico',
      'servicos publicos',
      'ubs',
      'posto de saude',
      'escola',
      'cras',
      'prefeitura',
      'biblioteca',
      'ecoponto',
      'terminal',
      'atendimento',
    ],
  ],
  [
    'commerce',
    [
      'comercio',
      'comercios',
      'loja',
      'padaria',
      'farmacia',
      'mercado',
      'restaurante',
      'comer',
      'comprar',
      'salao',
      'pet',
      'assistencia',
    ],
  ],
  [
    'rights',
    [
      'direito',
      'direitos',
      'consumidor',
      'procon',
      'lgpd',
      'privacidade',
      'idoso',
      'troca',
      'garantia',
      'lei',
    ],
  ],
  [
    'events',
    [
      'evento',
      'eventos',
      'agenda',
      'programacao',
      'fim de semana',
      'o que fazer',
      'feira',
      'mutirao',
      'oficina',
    ],
  ],
  [
    'transit',
    [
      'onibus',
      'linha de onibus',
      'transporte',
      'onibus acessivel',
      'onibus acessiveis',
      'piso baixo',
      'parada de onibus',
      'ponto de onibus',
    ],
  ],
  [
    'barriers',
    [
      'escada',
      'escadaria',
      'degrau',
      'barreira',
      'rampa',
      'piso tatil',
      'semaforo sonoro',
      'calcada',
      'acessibilidade',
      'deficiencia',
      'pessoa cega',
      'sou cego',
      'sou cega',
      'baixa visao',
      'caminho acessivel',
    ],
  ],
  [
    'app',
    [
      'nexa',
      'aplicativo',
      'como funciona',
      'ajuda',
      'demonstracao',
      'restaurar',
      'o que voce faz',
      'o que voce sabe',
    ],
  ],
  ['greeting', ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem']],
]

export function detectIntent(question: string): Intent {
  const text = normalizeText(question)
  let best: { intent: Intent; score: number } = { intent: 'unknown', score: 0 }
  for (const [intent, words] of INTENT_KEYWORDS) {
    const score = words.reduce(
      (sum, word) => sum + (text.includes(word) ? word.split(' ').length : 0),
      0,
    )
    if (score > best.score) best = { intent, score }
  }
  return best.intent
}

// ── Respostas do modo demonstrativo ──────────────────────────────────────────

async function replyServices(): Promise<Reply> {
  const services = (await repos.institutions.listServices()).slice(0, 5)
  return {
    content:
      'Estes são os serviços públicos de referência mais próximos de você. Toque em um deles para ver endereço e horário:',
    references: services.map((service) => ({
      kind: 'service',
      id: service.id,
      title: service.name,
      subtitle: `${PUBLIC_SERVICE_KIND_LABEL[service.kind]} · ${formatDistance(service.distanceMeters) || service.neighborhoodName}`,
      to: paths.publicService(service.id),
    })),
    actions: [
      { label: 'Ver instituições', to: paths.institutions, icon: 'landmark' },
      { label: 'Abrir no mapa', to: paths.mapLayer('services'), icon: 'map-pin' },
    ],
  }
}

async function replyCommerce(question: string): Promise<Reply> {
  const all = await repos.businesses.list({ sort: 'distance' })
  const text = normalizeText(question)
  const matching = all.filter((business) =>
    normalizeText(`${business.name} ${business.category.name} ${business.tags.join(' ')}`)
      .split(' ')
      .some((word) => word.length > 3 && text.includes(word)),
  )
  const list = (matching.length > 0 ? matching : all).slice(0, 4)
  return {
    content:
      matching.length > 0
        ? 'Encontrei estes estabelecimentos no Comércio Local, do mais perto para o mais longe:'
        : 'Estes são os comércios mais próximos do seu bairro. Apoiar o comércio local fortalece a comunidade!',
    references: list.map((business) => ({
      kind: 'business',
      id: business.id,
      title: business.name,
      subtitle: `${business.category.name} · ${business.isOpenNow ? 'Aberto' : 'Fechado'} · ${formatDistance(business.distanceMeters)}${business.rating ? ` · ★ ${formatRating(business.rating)}` : ''}`,
      to: paths.business(business.id),
    })),
    actions: [
      { label: 'Abrir Comércio Local', to: paths.businesses, icon: 'store' },
      { label: 'Ver no mapa', to: paths.mapLayer('businesses'), icon: 'map-pin' },
    ],
  }
}

function replyRights(): Reply {
  return {
    content: [
      'Posso dar orientações gerais (não substituem atendimento jurídico):',
      '• Consumidor: produtos com defeito podem ser reclamados em até 30 dias (não duráveis) ou 90 dias (duráveis). Em compras fora da loja, como pela internet, há 7 dias para desistir.',
      '• Pessoa idosa: atendimento preferencial em órgãos públicos e estabelecimentos, e gratuidade no transporte coletivo urbano a partir dos 65 anos.',
      '• Dados pessoais (LGPD): você pode pedir acesso, correção e exclusão dos seus dados. No NEXA, isso fica em Perfil → Configurações.',
      '• Serviços públicos: problemas no bairro podem ser registrados aqui como demanda e acompanhados pela comunidade.',
      'Para casos específicos, procure o Procon, a Defensoria Pública ou a ouvidoria do órgão responsável.',
    ].join('\n'),
    actions: [
      { label: 'Registrar demanda', to: paths.newDemand, icon: 'megaphone' },
      { label: 'Minha privacidade', to: paths.settings, icon: 'settings' },
      { label: 'Instituições', to: paths.institutions, icon: 'landmark' },
    ],
  }
}

function replyDemandHowTo(): Reply {
  return {
    content: [
      'Registrar uma demanda leva menos de um minuto:',
      '1. Toque em "Registrar demanda" e escolha a categoria (buraco, lixo, iluminação…).',
      '2. Descreva o problema e, se quiser, adicione fotos. Eu posso sugerir categoria e prioridade.',
      '3. Marque o local aproximado no mapa e envie.',
      'Você recebe um protocolo, acompanha cada atualização e os vizinhos podem apoiar o pedido.',
    ].join('\n'),
    actions: [
      { label: 'Registrar demanda', to: paths.newDemand, icon: 'megaphone' },
      { label: 'Ver demandas', to: paths.demands, icon: 'message' },
    ],
  }
}

async function replyEvents(): Promise<Reply> {
  const events = (await repos.events.list({ when: 'upcoming' })).slice(0, 4)
  if (events.length === 0) {
    return {
      content: 'Não encontrei eventos futuros cadastrados. Que tal criar o primeiro?',
      actions: [{ label: 'Criar evento', to: paths.newEvent, icon: 'calendar' }],
    }
  }
  return {
    content: `Há ${pluralize(events.length, 'evento próximo', 'eventos próximos')} na comunidade:`,
    references: events.map((event) => ({
      kind: 'event',
      id: event.id,
      title: event.title,
      subtitle: `${formatWeekdayDate(event.startsAt)} · ${formatEventTimeRange(event.startsAt, event.endsAt)} · ${event.venue}`,
      to: paths.event(event.id),
    })),
    actions: [{ label: 'Ver todos os eventos', to: paths.events, icon: 'calendar' }],
  }
}

async function replyProblems(): Promise<Reply> {
  const demands = await repos.demands.list({ status: 'all', sort: 'supported' })
  const open = demands.filter((demand) => OPEN_DEMAND_STATUSES.includes(demand.status))
  const resolved = demands.filter((demand) => demand.status === 'resolved').length
  const byCategory = new Map<string, number>()
  for (const demand of open) {
    byCategory.set(demand.category.name, (byCategory.get(demand.category.name) ?? 0) + 1)
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  return {
    content: [
      `Resumo das demandas registradas: ${demands.length} no total, ${open.length} em aberto e ${resolved} resolvidas.`,
      top.length > 0
        ? `Os temas mais frequentes em aberto são ${top.map(([name, count]) => `${name} (${count})`).join(', ')}.`
        : 'Não há demandas em aberto no momento.',
      'Estas são as mais apoiadas pela comunidade:',
    ].join('\n'),
    references: open.slice(0, 3).map((demand) => ({
      kind: 'demand',
      id: demand.id,
      title: demand.title,
      subtitle: `${DEMAND_STATUS_LABEL[demand.status]} · ${pluralize(demand.supportCount, 'apoio', 'apoios')} · ${demand.neighborhoodName}`,
      to: paths.demand(demand.id),
    })),
    actions: [
      { label: 'Ver demandas', to: paths.demands, icon: 'megaphone' },
      { label: 'Ver no mapa', to: paths.mapLayer('demands'), icon: 'map-pin' },
    ],
  }
}

async function replyBusiness(user: User): Promise<Reply> {
  if (user.role !== 'merchant' || !user.businessId) {
    return {
      content:
        'O NEXA Business ajuda comerciantes a organizar produtos, vendas, estoque e finanças, com recomendações da NEXA IA. Para usar, cadastre o seu estabelecimento no Comércio Local.',
      actions: [
        { label: 'Divulgar meu negócio', to: paths.newBusiness, icon: 'store' },
        { label: 'Conhecer os planos', to: paths.plans, icon: 'star' },
      ],
    }
  }
  const [products, sales, transactions] = await Promise.all([
    repos.products.list(user.businessId, { includeInactive: true }),
    repos.sales.list(user.businessId),
    repos.transactions.list(user.businessId),
  ])
  const summary = computeBusinessSummary({
    products,
    sales,
    transactions,
    range: rangeForPreset('7d'),
  })
  const insights = buildBusinessInsights(summary).slice(0, 4)
  return {
    content: [
      `Nos últimos 7 dias você faturou ${formatCurrency(summary.revenueCents)} em ${pluralize(summary.salesCount, 'venda', 'vendas')} (${formatChange(summary.change.revenue)} em relação à semana anterior).`,
      ...insights.map((insight) => `• ${insight.title}`),
      'Estas análises usam apenas os registros do seu próprio negócio.',
    ].join('\n'),
    actions: [
      { label: 'Abrir NEXA Business', to: paths.businessDashboard, icon: 'chart' },
      { label: 'Ver recomendações', to: paths.businessInsights, icon: 'sparkles' },
      { label: 'Registrar venda', to: paths.businessNewSale, icon: 'receipt' },
    ],
  }
}

function replyApp(): Reply {
  return {
    content: [
      'O NEXA conecta moradores, comércio local e instituições em um só lugar. Você pode:',
      '• conversar e se organizar no feed da Comunidade;',
      '• registrar e apoiar demandas do bairro e acompanhá-las no mapa;',
      '• descobrir negócios e eventos perto de você;',
      '• (comerciantes) gerir produtos, vendas e finanças no NEXA Business.',
      'Este é um ambiente de demonstração: os dados são fictícios e ficam só neste aparelho. Para recomeçar, use Perfil → Configurações → Restaurar dados demonstrativos.',
    ].join('\n'),
    actions: [
      { label: 'Explorar a comunidade', to: paths.community, icon: 'users' },
      { label: 'Abrir o mapa', to: paths.map, icon: 'map-pin' },
      { label: 'Ajuda', to: paths.help, icon: 'info' },
    ],
  }
}

async function replyTransit(): Promise<Reply> {
  const lines = (await repos.mobility.listLines({ accessibleOnly: true })).slice(0, 5)
  if (lines.length === 0) {
    return {
      content: 'Não encontrei linhas de ônibus acessíveis cadastradas.',
      actions: [{ label: 'Ver todas as linhas', to: paths.mobilityTab('onibus'), icon: 'bus' }],
    }
  }
  return {
    content:
      'Estas linhas têm ônibus acessíveis. Toque em uma delas para ver os recursos, as paradas e as próximas partidas (dados demonstrativos):',
    references: lines.map((line) => ({
      kind: 'transit',
      id: line.id,
      title: `Linha ${line.code} · ${line.name}`,
      subtitle: `${FLEET_ACCESSIBILITY_LABEL[line.fleet]} · ${
        line.nextDepartures[0] ? `próxima às ${line.nextDepartures[0]}` : 'sem mais partidas hoje'
      }`,
      to: paths.mobilityLine(line.id),
    })),
    actions: [
      { label: 'Ver todas as linhas', to: paths.mobilityTab('onibus'), icon: 'bus' },
      { label: 'Paradas no mapa', to: paths.mapLayer('transit'), icon: 'map-pin' },
    ],
  }
}

async function replyBarriers(): Promise<Reply> {
  const barriers = (await repos.mobility.listAccessPoints({ nature: 'barrier' })).slice(0, 4)
  if (barriers.length === 0) {
    return {
      content: 'Não há barreiras cadastradas perto de você.',
      actions: [
        { label: 'Abrir a mobilidade', to: paths.mobilityTab('caminho'), icon: 'accessibility' },
      ],
    }
  }
  return {
    content:
      'Estas são as barreiras cadastradas mais perto de você, com o caminho alternativo de cada uma. Na aba Alertas, o NEXA avisa por voz e vibração quando você se aproxima (dados demonstrativos):',
    references: barriers.map((point) => ({
      kind: 'access',
      id: point.id,
      title: point.title,
      subtitle: `${ACCESS_POINT_KIND_LABEL[point.kind]} · ${formatDistance(point.distanceMeters)}`,
      to: paths.mobilityPoint(point.id),
    })),
    actions: [
      { label: 'Barreiras e apoios', to: paths.mobilityTab('caminho'), icon: 'accessibility' },
      { label: 'Ouvir os alertas', to: paths.mobilityTab('alertas'), icon: 'audio' },
      { label: 'Opções de acessibilidade', to: paths.accessibility, icon: 'settings' },
    ],
  }
}

async function demoReply(question: string, user: User): Promise<Reply> {
  switch (detectIntent(question)) {
    case 'transit':
      return replyTransit()
    case 'barriers':
      return replyBarriers()
    case 'services':
      return replyServices()
    case 'commerce':
      return replyCommerce(question)
    case 'rights':
      return replyRights()
    case 'demand':
      return replyDemandHowTo()
    case 'events':
      return replyEvents()
    case 'problems':
      return replyProblems()
    case 'business':
      return replyBusiness(user)
    case 'app':
      return replyApp()
    case 'greeting':
      return {
        content: `Olá, ${firstName(user.name)}! Posso ajudar a encontrar serviços, comércios e eventos, explicar como registrar uma demanda ou resumir o que acontece no seu bairro.`,
      }
    default:
      return {
        content:
          'Ainda não sei responder a isso no modo demonstração. Posso ajudar com serviços públicos, comércio local, eventos, demandas do bairro, dúvidas gerais sobre direitos e gestão do seu negócio — escolha uma das sugestões abaixo.',
      }
  }
}

// ── Modo "ao vivo" (backend configurado) ─────────────────────────────────────

/** Contexto CONTROLADO enviado ao backend: apenas dados públicos e agregados. */
async function buildLiveContext(user: User): Promise<Record<string, unknown>> {
  const [summary, events, businesses] = await Promise.all([
    repos.stats.getCommunitySummary(),
    repos.events.list({ when: 'upcoming' }),
    repos.businesses.list({ sort: 'distance' }),
  ])
  return {
    usuario: { primeiroNome: firstName(user.name), perfil: user.role },
    resumoComunitario: summary,
    proximosEventos: events
      .slice(0, 6)
      .map((event) => ({ titulo: event.title, quando: event.startsAt, local: event.venue })),
    comercios: businesses.slice(0, 8).map((business) => ({
      nome: business.name,
      categoria: business.category.name,
      aberto: business.isOpenNow,
    })),
  }
}

async function liveReply(question: string, history: AIMessage[], user: User): Promise<Reply> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs)
  try {
    const response = await fetch(`${config.ai.apiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        question,
        history: history
          .slice(-10)
          .map((message) => ({ role: message.role, content: message.content })),
        context: await buildLiveContext(user),
      }),
    })
    if (!response.ok) throw new Error(`Backend da NEXA IA respondeu ${response.status}`)
    const data = (await response.json()) as { content?: unknown }
    if (typeof data.content !== 'string' || data.content.trim() === '') {
      throw new Error('Resposta vazia do backend da NEXA IA')
    }
    // As ações de navegação continuam determinísticas: vêm da intenção da pergunta.
    const navigation = await demoReply(question, user)
    return { content: data.content, actions: navigation.actions }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Responde a uma pergunta. Nunca lança: falhas viram uma mensagem com `error: true`.
 */
export async function askAssistant(
  question: string,
  history: AIMessage[],
  user: User,
): Promise<AIMessage> {
  const base = { id: createId('msg'), role: 'assistant' as const, createdAt: nowISO() }
  try {
    if (AI_MODE === 'live') {
      try {
        return { ...base, mode: 'live', ...(await liveReply(question, history, user)) }
      } catch (error) {
        console.warn('[NEXA IA] Backend indisponível; usando o modo demonstrativo.', error)
      }
    }
    // Pequena espera para o indicador de digitação (a resposta local é instantânea).
    await new Promise((resolve) => setTimeout(resolve, config.demoLatencyMs > 0 ? 650 : 0))
    return { ...base, mode: 'demo', ...(await demoReply(question, user)) }
  } catch {
    return {
      ...base,
      mode: 'demo',
      error: true,
      content: 'Não consegui responder agora. Tente novamente em instantes.',
    }
  }
}
