import type { Plan } from '@/types'

/**
 * PLANOS DO NEXA (conteúdo estático)
 * ─────────────────────────────────────────────────────────────────────────────
 * Apresentação demonstrativa dos planos. Nenhum valor é inventado: planos pagos
 * exibem "Preço a definir". O protótipo não realiza cobrança nem pagamento.
 */
export const PLANS: Plan[] = [
  {
    id: 'community',
    name: 'NEXA Comunidade',
    audience: 'Para moradores',
    priceLabel: 'Gratuito',
    description:
      'Tudo o que o morador precisa para participar da vida do bairro e fazer a diferença.',
    features: [
      'Feed comunitário',
      'Registro de demandas',
      'Mapa inteligente',
      'Eventos',
      'Catálogo comercial',
      'Recursos básicos de IA',
    ],
    icon: 'users',
    illustration: 'neighborhood',
  },
  {
    id: 'business_free',
    name: 'NEXA Business',
    audience: 'Para comerciantes',
    priceLabel: 'Gratuito',
    description: 'Ferramentas simples para colocar o seu negócio no mapa e organizar o dia a dia.',
    features: [
      'Cadastro de estabelecimento',
      'Gestão básica de produtos',
      'Registro de vendas',
      'Painel simplificado',
    ],
    icon: 'store',
    illustration: 'storefront',
  },
  {
    id: 'business_premium',
    name: 'NEXA Business Premium',
    audience: 'Para comerciantes que querem crescer',
    priceLabel: 'Preço a definir',
    description:
      'Análises e inteligência para tomar decisões melhores e aumentar o lucro do negócio.',
    features: [
      'Relatórios avançados',
      'Análises inteligentes',
      'Indicadores financeiros',
      'Recomendações de IA',
      'Ferramentas avançadas de gestão',
    ],
    highlight: true,
    icon: 'sparkles',
    illustration: 'bakery',
  },
  {
    id: 'institutional',
    name: 'NEXA Institucional',
    audience: 'Para prefeituras, ONGs e associações',
    priceLabel: 'Preço a definir',
    description:
      'Uma visão clara do que a comunidade precisa, para agir com mais rapidez e transparência.',
    features: [
      'Painel de demandas',
      'Indicadores comunitários',
      'Gestão de iniciativas',
      'Relatórios agregados',
    ],
    icon: 'landmark',
    illustration: 'meeting',
  },
]

/** Valor de uma linha da comparação: incluído, não incluído ou um texto curto. */
export type PlanCellValue = boolean | string

export interface PlanComparisonRow {
  feature: string
  availability: Record<Plan['id'], PlanCellValue>
}

/** Matriz de comparação (recurso × plano). */
export const PLAN_COMPARISON: PlanComparisonRow[] = [
  {
    feature: 'Feed comunitário',
    availability: {
      community: true,
      business_free: true,
      business_premium: true,
      institutional: true,
    },
  },
  {
    feature: 'Registro e acompanhamento de demandas',
    availability: {
      community: true,
      business_free: true,
      business_premium: true,
      institutional: 'Painel de gestão',
    },
  },
  {
    feature: 'Mapa inteligente',
    availability: {
      community: true,
      business_free: true,
      business_premium: true,
      institutional: true,
    },
  },
  {
    feature: 'Eventos da comunidade',
    availability: {
      community: true,
      business_free: true,
      business_premium: true,
      institutional: true,
    },
  },
  {
    feature: 'Catálogo de comércio local',
    availability: {
      community: true,
      business_free: true,
      business_premium: true,
      institutional: true,
    },
  },
  {
    feature: 'Recursos básicos de IA',
    availability: {
      community: true,
      business_free: true,
      business_premium: true,
      institutional: true,
    },
  },
  {
    feature: 'Cadastro de estabelecimento',
    availability: {
      community: false,
      business_free: true,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Gestão básica de produtos',
    availability: {
      community: false,
      business_free: true,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Registro de vendas',
    availability: {
      community: false,
      business_free: true,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Painel simplificado',
    availability: {
      community: false,
      business_free: true,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Relatórios avançados',
    availability: {
      community: false,
      business_free: false,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Análises inteligentes',
    availability: {
      community: false,
      business_free: false,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Indicadores financeiros',
    availability: {
      community: false,
      business_free: false,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Recomendações de IA',
    availability: {
      community: false,
      business_free: false,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Ferramentas avançadas de gestão',
    availability: {
      community: false,
      business_free: false,
      business_premium: true,
      institutional: false,
    },
  },
  {
    feature: 'Painel de demandas',
    availability: {
      community: false,
      business_free: false,
      business_premium: false,
      institutional: true,
    },
  },
  {
    feature: 'Indicadores comunitários',
    availability: {
      community: false,
      business_free: false,
      business_premium: false,
      institutional: true,
    },
  },
  {
    feature: 'Gestão de iniciativas',
    availability: {
      community: false,
      business_free: false,
      business_premium: false,
      institutional: true,
    },
  },
  {
    feature: 'Relatórios agregados',
    availability: {
      community: false,
      business_free: false,
      business_premium: false,
      institutional: true,
    },
  },
]

/** Aviso exibido junto aos planos. */
export const PLANS_DISCLAIMER =
  'Apresentação demonstrativa. O protótipo não realiza cobranças e os valores dos planos pagos ainda serão definidos.'
