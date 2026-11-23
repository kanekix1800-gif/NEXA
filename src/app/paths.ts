import type { ID, MapLayer, PostCategory, UserRole } from '@/types'

/**
 * MAPA DE ROTAS DO NEXA
 * ─────────────────────────────────────────────────────────────────────────────
 * Fonte única dos caminhos do aplicativo. Nunca escreva URLs "na mão" em
 * componentes ou dados: use sempre `paths`.
 */
export const paths = {
  // ── Públicas ──
  welcome: '/',
  onboarding: '/boas-vindas',
  login: '/entrar',
  signUp: '/cadastro',
  recoverPassword: '/recuperar-senha',
  /** Entra direto em um perfil demonstrativo (permite um QR Code por perfil). */
  demoAs: (role: UserRole) => `/entrar?demo=${role}`,
  /** Termos de uso e aviso de privacidade (acessíveis com ou sem sessão). */
  terms: '/termos',
  privacy: '/privacidade',

  // ── Início e notícias ──
  home: '/inicio',
  news: '/noticias',
  newsArticle: (id: ID) => `/noticias/${id}`,

  // ── Comunidade ──
  community: '/comunidade',
  /** Composição de publicação; aceita categoria pré-selecionada. */
  newPost: (category?: PostCategory) =>
    category ? `/comunidade/nova?categoria=${category}` : '/comunidade/nova',
  post: (id: ID) => `/comunidade/${id}`,
  userProfile: (id: ID) => `/pessoas/${id}`,

  // ── Demandas ──
  demands: '/demandas',
  newDemand: '/demandas/nova',
  demand: (id: ID) => `/demandas/${id}`,

  // ── Mapa inteligente ──
  map: '/mapa',
  /** Abre o mapa com um ponto em foco (ex.: `mapFocus('demands', 'dem_01')`). */
  mapFocus: (layer: MapLayer, refId: ID) => `/mapa?foco=${layer}:${refId}`,
  /** Abre o mapa com apenas uma camada ativa. */
  mapLayer: (layer: MapLayer) => `/mapa?camada=${layer}`,

  // ── Comércio local ──
  businesses: '/comercio',
  newBusiness: '/comercio/novo',
  business: (id: ID) => `/comercio/${id}`,
  editBusiness: (id: ID) => `/comercio/${id}/editar`,

  // ── NEXA Business (comerciantes) ──
  businessDashboard: '/business',
  businessProducts: '/business/produtos',
  businessSales: '/business/vendas',
  businessNewSale: '/business/vendas/nova',
  businessFinance: '/business/financas',
  businessInsights: '/business/insights',

  // ── NEXA IA ──
  assistant: '/ia',
  /** Abre a assistente já enviando uma pergunta. */
  assistantAsk: (question: string) => `/ia?pergunta=${encodeURIComponent(question)}`,

  // ── Instituições e serviços públicos ──
  institutions: '/instituicoes',
  institution: (id: ID) => `/instituicoes/${id}`,
  publicService: (id: ID) => `/servicos/${id}`,
  institutionPanel: '/painel-institucional',

  // ── Eventos ──
  events: '/eventos',
  newEvent: '/eventos/novo',
  event: (id: ID) => `/eventos/${id}`,
  editEvent: (id: ID) => `/eventos/${id}/editar`,

  // ── Notificações ──
  notifications: '/notificacoes',

  // ── Perfil ──
  profile: '/perfil',
  editProfile: '/perfil/editar',
  myPosts: '/perfil/publicacoes',
  myDemands: '/perfil/demandas',
  myEvents: '/perfil/eventos',
  myFavorites: '/perfil/favoritos',
  settings: '/configuracoes',
  help: '/ajuda',
  plans: '/planos',

  // ── Administração ──
  admin: '/admin',
  adminModeration: '/admin/moderacao',
  adminCategories: '/admin/categorias',
  adminDemands: '/admin/demandas',
  adminEvents: '/admin/eventos',
  adminUsers: '/admin/usuarios',
  adminInstitutions: '/admin/instituicoes',
} as const

/**
 * Padrões de rota (com parâmetros) usados na configuração do roteador.
 * Mantêm correspondência 1:1 com as funções de `paths`.
 */
export const routePatterns = {
  newsArticle: '/noticias/:id',
  newPost: '/comunidade/nova',
  post: '/comunidade/:id',
  userProfile: '/pessoas/:id',
  demand: '/demandas/:id',
  business: '/comercio/:id',
  editBusiness: '/comercio/:id/editar',
  institution: '/instituicoes/:id',
  publicService: '/servicos/:id',
  event: '/eventos/:id',
  editEvent: '/eventos/:id/editar',
} as const

/** Rota inicial após o login. */
export const DEFAULT_AUTHENTICATED_PATH = paths.home

/**
 * URL absoluta e compartilhável de uma rota interna.
 *
 * O NEXA é publicado como site estático (GitHub Pages) em um subcaminho e usa
 * roteamento por HASH — por isso a rota fica depois de "#". Exemplo:
 * `absoluteUrl('/eventos/evt_01')` → "https://usuario.github.io/NEXA/#/eventos/evt_01".
 */
export function absoluteUrl(path: string): string {
  if (typeof window === 'undefined') return `#${path}`
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${path.startsWith('/') ? path : `/${path}`}`
}
