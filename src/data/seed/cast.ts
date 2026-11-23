import type {
  CategoryKind,
  ColorKey,
  IconKey,
  ID,
  IllustrationKey,
  InstitutionCategory,
  PublicServiceKind,
  UserRole,
} from '@/types'

/**
 * ELENCO DA BASE DEMONSTRATIVA
 * ─────────────────────────────────────────────────────────────────────────────
 * Lista fixa de quem e do que existe no "mundo" de demonstração do NEXA: bairros,
 * pessoas, estabelecimentos, instituições, serviços públicos e categorias.
 *
 * Todos os arquivos de carga (`core.ts`, `community.ts`) partem deste elenco, o que
 * garante que os dados se relacionem sem contradições. Os nomes são FICTÍCIOS.
 *
 * Posições: deslocamento em metros (norte, leste) em relação ao centro do mapa
 * configurado (`config.map.center`). Nada aqui é um endereço real.
 */

export type Offset = readonly [northMeters: number, eastMeters: number]

// ── Bairros ──────────────────────────────────────────────────────────────────

export interface CastNeighborhood {
  id: ID
  name: string
  offset: Offset
}

export const NEIGHBORHOODS = {
  centro: { id: 'nb_centro', name: 'Centro', offset: [0, 0] },
  vila: { id: 'nb_vila', name: 'Vila Esperança', offset: [900, -700] },
  jardim: { id: 'nb_jardim', name: 'Jardim das Flores', offset: [-800, 900] },
  parque: { id: 'nb_parque', name: 'Parque das Águas', offset: [700, 1100] },
  alto: { id: 'nb_alto', name: 'Alto da Serra', offset: [-1000, -900] },
} as const satisfies Record<string, CastNeighborhood>

export type NeighborhoodKey = keyof typeof NEIGHBORHOODS

// ── Instituições (exatamente 4, conforme a especificação) ────────────────────

export interface CastInstitution {
  id: ID
  name: string
  category: InstitutionCategory
  tagline: string
  icon: IconKey
  color: ColorKey
  neighborhood: NeighborhoodKey
  offset: Offset
}

export const INSTITUTIONS = {
  prefeitura: {
    id: 'ins_prefeitura',
    name: 'Prefeitura Municipal',
    category: 'city_hall',
    tagline: 'Serviços e informações',
    icon: 'landmark',
    color: 'green',
    neighborhood: 'centro',
    offset: [120, 80],
  },
  vivaMelhor: {
    id: 'ins_viva_melhor',
    name: 'ONG Viva Melhor',
    category: 'ngo',
    tagline: 'Projetos sociais',
    icon: 'hand-heart',
    color: 'orange',
    neighborhood: 'jardim',
    offset: [-650, 760],
  },
  sebrae: {
    id: 'ins_sebrae',
    name: 'SEBRAE',
    category: 'business_support',
    tagline: 'Apoio ao empreendedor',
    icon: 'briefcase',
    color: 'blue',
    neighborhood: 'centro',
    offset: [-180, 260],
  },
  associacao: {
    id: 'ins_associacao',
    name: 'Associação de Moradores',
    category: 'community_association',
    tagline: 'Vila Esperança unida',
    icon: 'users',
    color: 'teal',
    neighborhood: 'vila',
    offset: [1020, -820],
  },
} as const satisfies Record<string, CastInstitution>

export type InstitutionKey = keyof typeof INSTITUTIONS

// ── Pessoas ──────────────────────────────────────────────────────────────────

export interface CastPerson {
  id: ID
  name: string
  username: string
  role: UserRole
  neighborhood: NeighborhoodKey
  /** Comerciantes: chave do estabelecimento em `BUSINESSES`. */
  business?: string
  /** Contas institucionais: chave da instituição em `INSTITUTIONS`. */
  institution?: InstitutionKey
  /** Conta de acesso rápido do modo demonstração. */
  demo?: boolean
}

/** 12 moradores. */
export const RESIDENTS = {
  antonio: {
    id: 'usr_antonio',
    name: 'Antonio Silva',
    username: 'antonio_nexa',
    role: 'resident',
    neighborhood: 'vila',
    demo: true,
  },
  maria: {
    id: 'usr_maria',
    name: 'Maria Silva',
    username: 'maria.silva',
    role: 'resident',
    neighborhood: 'vila',
  },
  joao: {
    id: 'usr_joao',
    name: 'João Pereira',
    username: 'joaopereira',
    role: 'resident',
    neighborhood: 'centro',
  },
  ana: {
    id: 'usr_ana',
    name: 'Ana Costa',
    username: 'ana_costa',
    role: 'resident',
    neighborhood: 'jardim',
  },
  pedro: {
    id: 'usr_pedro',
    name: 'Pedro Santos',
    username: 'pedro.santos',
    role: 'resident',
    neighborhood: 'parque',
  },
  juliana: {
    id: 'usr_juliana',
    name: 'Juliana Oliveira',
    username: 'ju_oliveira',
    role: 'resident',
    neighborhood: 'centro',
  },
  carlos: {
    id: 'usr_carlos',
    name: 'Carlos Souza',
    username: 'carlos.souza',
    role: 'resident',
    neighborhood: 'alto',
  },
  fernanda: {
    id: 'usr_fernanda',
    name: 'Fernanda Lima',
    username: 'fe_lima',
    role: 'resident',
    neighborhood: 'jardim',
  },
  rafael: {
    id: 'usr_rafael',
    name: 'Rafael Almeida',
    username: 'rafa_almeida',
    role: 'resident',
    neighborhood: 'vila',
  },
  beatriz: {
    id: 'usr_beatriz',
    name: 'Beatriz Rocha',
    username: 'bia.rocha',
    role: 'resident',
    neighborhood: 'parque',
  },
  luiz: {
    id: 'usr_luiz',
    name: 'Luiz Gomes',
    username: 'seu_luiz',
    role: 'resident',
    neighborhood: 'alto',
  },
  camila: {
    id: 'usr_camila',
    name: 'Camila Ribeiro',
    username: 'camila.ribeiro',
    role: 'resident',
    neighborhood: 'centro',
  },
} as const satisfies Record<string, CastPerson>

/** 8 comerciantes — um por estabelecimento. */
export const MERCHANTS = {
  carla: {
    id: 'usr_carla',
    name: 'Carla Mendes',
    username: 'carla.padaria',
    role: 'merchant',
    neighborhood: 'vila',
    business: 'padaria',
    demo: true,
  },
  marcos: {
    id: 'usr_marcos',
    name: 'Marcos Teixeira',
    username: 'marcos.teixeira',
    role: 'merchant',
    neighborhood: 'centro',
    business: 'farmacia',
  },
  lucia: {
    id: 'usr_lucia',
    name: 'Lúcia Barbosa',
    username: 'dona_lucia',
    role: 'merchant',
    neighborhood: 'vila',
    business: 'mercadinho',
  },
  paulo: {
    id: 'usr_paulo',
    name: 'Paulo Henrique Dias',
    username: 'paulo.sabordecasa',
    role: 'merchant',
    neighborhood: 'centro',
    business: 'restaurante',
  },
  patricia: {
    id: 'usr_patricia',
    name: 'Patrícia Nogueira',
    username: 'studio.bela',
    role: 'merchant',
    neighborhood: 'jardim',
    business: 'salao',
  },
  diego: {
    id: 'usr_diego',
    name: 'Diego Martins',
    username: 'diego.tecnofix',
    role: 'merchant',
    neighborhood: 'parque',
    business: 'tecnofix',
  },
  heloisa: {
    id: 'usr_heloisa',
    name: 'Heloísa Campos',
    username: 'atelie.flordechita',
    role: 'merchant',
    neighborhood: 'jardim',
    business: 'atelie',
  },
  bruno: {
    id: 'usr_bruno',
    name: 'Bruno Cardoso',
    username: 'bruno.petamigo',
    role: 'merchant',
    neighborhood: 'alto',
    business: 'pet',
  },
} as const satisfies Record<string, CastPerson>

/** Contas institucionais (o SEBRAE é apenas um exemplo no diretório, sem conta). */
export const INSTITUTION_REPS = {
  roberto: {
    id: 'usr_roberto',
    name: 'Roberto Nunes',
    username: 'roberto.prefeitura',
    role: 'institution',
    neighborhood: 'centro',
    institution: 'prefeitura',
    demo: true,
  },
  sandra: {
    id: 'usr_sandra',
    name: 'Sandra Vieira',
    username: 'sandra.vivamelhor',
    role: 'institution',
    neighborhood: 'jardim',
    institution: 'vivaMelhor',
  },
  jorge: {
    id: 'usr_jorge',
    name: 'Jorge Batista',
    username: 'jorge.associacao',
    role: 'institution',
    neighborhood: 'vila',
    institution: 'associacao',
  },
} as const satisfies Record<string, CastPerson>

export const ADMINS = {
  helena: {
    id: 'usr_helena',
    name: 'Helena Duarte',
    username: 'equipe.nexa',
    role: 'admin',
    neighborhood: 'centro',
    demo: true,
  },
} as const satisfies Record<string, CastPerson>

/** Todas as pessoas do elenco. */
export const PEOPLE = { ...RESIDENTS, ...MERCHANTS, ...INSTITUTION_REPS, ...ADMINS } as const

export type PersonKey = keyof typeof PEOPLE

// ── Categorias ───────────────────────────────────────────────────────────────

export interface CastCategory {
  id: ID
  kind: CategoryKind
  name: string
  description?: string
  icon: IconKey
  color: ColorKey
  /** Somente demandas: instituição sugerida como possível responsável. */
  defaultInstitution?: InstitutionKey
}

/** As 8 categorias de demanda da especificação, na ordem em que aparecem. */
export const DEMAND_CATEGORIES = {
  pothole: {
    id: 'cat_dem_buraco',
    kind: 'demand',
    name: 'Buraco na rua',
    description: 'Buracos, asfalto danificado e calçadas quebradas.',
    icon: 'pothole',
    color: 'terracotta',
    defaultInstitution: 'prefeitura',
  },
  trash: {
    id: 'cat_dem_lixo',
    kind: 'demand',
    name: 'Lixo acumulado',
    description: 'Descarte irregular, entulho e falhas na coleta.',
    icon: 'trash',
    color: 'green',
    defaultInstitution: 'prefeitura',
  },
  lighting: {
    id: 'cat_dem_iluminacao',
    kind: 'demand',
    name: 'Falta de iluminação',
    description: 'Lâmpadas queimadas e trechos escuros.',
    icon: 'lightbulb',
    color: 'orange',
    defaultInstitution: 'prefeitura',
  },
  transport: {
    id: 'cat_dem_transporte',
    kind: 'demand',
    name: 'Problemas no transporte',
    description: 'Pontos de ônibus, horários e linhas.',
    icon: 'bus',
    color: 'blue',
    defaultInstitution: 'prefeitura',
  },
  accessibility: {
    id: 'cat_dem_acessibilidade',
    kind: 'demand',
    name: 'Acessibilidade',
    description: 'Rampas, calçadas e travessias acessíveis.',
    icon: 'accessibility',
    color: 'purple',
    defaultInstitution: 'prefeitura',
  },
  sanitation: {
    id: 'cat_dem_saneamento',
    kind: 'demand',
    name: 'Saneamento',
    description: 'Vazamentos, esgoto e drenagem.',
    icon: 'droplets',
    color: 'teal',
    defaultInstitution: 'prefeitura',
  },
  infrastructure: {
    id: 'cat_dem_infraestrutura',
    kind: 'demand',
    name: 'Segurança de infraestrutura',
    description: 'Estruturas com risco: muros, pontes, fiação e árvores.',
    icon: 'alert',
    color: 'gold',
    defaultInstitution: 'prefeitura',
  },
  other: {
    id: 'cat_dem_outros',
    kind: 'demand',
    name: 'Outros',
    description: 'Outros problemas do bairro.',
    icon: 'more',
    color: 'gray',
    defaultInstitution: 'associacao',
  },
} as const satisfies Record<string, CastCategory>

/** As 7 categorias de comércio da especificação. */
export const BUSINESS_CATEGORIES = {
  food: {
    id: 'cat_biz_alimentacao',
    kind: 'business',
    name: 'Alimentação',
    icon: 'utensils',
    color: 'orange',
  },
  services: {
    id: 'cat_biz_servicos',
    kind: 'business',
    name: 'Serviços',
    icon: 'wrench',
    color: 'blue',
  },
  fashion: { id: 'cat_biz_moda', kind: 'business', name: 'Moda', icon: 'shirt', color: 'pink' },
  health: {
    id: 'cat_biz_saude',
    kind: 'business',
    name: 'Saúde e bem-estar',
    icon: 'heart-pulse',
    color: 'terracotta',
  },
  tech: {
    id: 'cat_biz_tecnologia',
    kind: 'business',
    name: 'Tecnologia',
    icon: 'laptop',
    color: 'purple',
  },
  markets: {
    id: 'cat_biz_mercados',
    kind: 'business',
    name: 'Mercados',
    icon: 'basket',
    color: 'green',
  },
  other: { id: 'cat_biz_outros', kind: 'business', name: 'Outros', icon: 'store', color: 'gray' },
} as const satisfies Record<string, CastCategory>

export const EVENT_CATEGORIES = {
  entrepreneurship: {
    id: 'cat_evt_empreendedorismo',
    kind: 'event',
    name: 'Empreendedorismo',
    icon: 'tent',
    color: 'orange',
  },
  health: {
    id: 'cat_evt_saude',
    kind: 'event',
    name: 'Saúde',
    icon: 'stethoscope',
    color: 'terracotta',
  },
  solidarity: {
    id: 'cat_evt_solidariedade',
    kind: 'event',
    name: 'Solidariedade',
    icon: 'heart-handshake',
    color: 'pink',
  },
  education: {
    id: 'cat_evt_educacao',
    kind: 'event',
    name: 'Educação',
    icon: 'graduation',
    color: 'blue',
  },
  environment: {
    id: 'cat_evt_meio_ambiente',
    kind: 'event',
    name: 'Meio ambiente',
    icon: 'sprout',
    color: 'green',
  },
  culture: {
    id: 'cat_evt_cultura',
    kind: 'event',
    name: 'Cultura',
    icon: 'music',
    color: 'purple',
  },
  sports: { id: 'cat_evt_esporte', kind: 'event', name: 'Esporte', icon: 'trophy', color: 'teal' },
} as const satisfies Record<string, CastCategory>

// ── Estabelecimentos (exatamente 8) ──────────────────────────────────────────

export interface CastBusiness {
  id: ID
  name: string
  owner: keyof typeof MERCHANTS
  category: keyof typeof BUSINESS_CATEGORIES
  neighborhood: NeighborhoodKey
  offset: Offset
  illustration: IllustrationKey
  /** Endereço fictício. */
  address: string
}

/**
 * As posições dos três primeiros reproduzem a referência visual para o morador
 * demonstrativo (bairro Vila Esperança): 500 m, 700 m e 1 km.
 */
export const BUSINESSES = {
  padaria: {
    id: 'biz_padaria',
    name: 'Padaria do Bairro',
    owner: 'carla',
    category: 'food',
    neighborhood: 'vila',
    offset: [1200, -300],
    illustration: 'bakery',
    address: 'Rua das Acácias, 120 — Vila Esperança',
  },
  farmacia: {
    id: 'biz_farmacia',
    name: 'Farmácia Popular',
    owner: 'marcos',
    category: 'health',
    neighborhood: 'centro',
    offset: [340, -280],
    illustration: 'pharmacy',
    address: 'Avenida Principal, 845 — Centro',
  },
  mercadinho: {
    id: 'biz_mercadinho',
    name: 'Mercadinho da Vila',
    owner: 'lucia',
    category: 'markets',
    neighborhood: 'vila',
    offset: [1500, -1500],
    illustration: 'market',
    address: 'Rua do Ipê Amarelo, 58 — Vila Esperança',
  },
  restaurante: {
    id: 'biz_restaurante',
    name: 'Sabor de Casa Restaurante',
    owner: 'paulo',
    category: 'food',
    neighborhood: 'centro',
    offset: [-120, -160],
    illustration: 'restaurant',
    address: 'Praça da Matriz, 22 — Centro',
  },
  salao: {
    id: 'biz_salao',
    name: 'Studio Bela Cabeleireiros',
    owner: 'patricia',
    category: 'services',
    neighborhood: 'jardim',
    offset: [-720, 1010],
    illustration: 'salon',
    address: 'Rua das Hortênsias, 310 — Jardim das Flores',
  },
  tecnofix: {
    id: 'biz_tecnofix',
    name: 'TecnoFix Assistência Técnica',
    owner: 'diego',
    category: 'tech',
    neighborhood: 'parque',
    offset: [780, 1240],
    illustration: 'tech-repair',
    address: 'Avenida das Nascentes, 77 — Parque das Águas',
  },
  atelie: {
    id: 'biz_atelie',
    name: 'Ateliê Flor de Chita',
    owner: 'heloisa',
    category: 'fashion',
    neighborhood: 'jardim',
    offset: [-900, 780],
    illustration: 'clothing',
    address: 'Travessa dos Girassóis, 14 — Jardim das Flores',
  },
  pet: {
    id: 'biz_pet',
    name: 'Pet Amigo Banho & Tosa',
    owner: 'bruno',
    category: 'other',
    neighborhood: 'alto',
    offset: [-1080, -760],
    illustration: 'petshop',
    address: 'Rua do Mirante, 201 — Alto da Serra',
  },
} as const satisfies Record<string, CastBusiness>

export type BusinessKey = keyof typeof BUSINESSES

// ── Serviços públicos de referência (camada "Serviços" do mapa) ──────────────

export interface CastPublicService {
  id: ID
  name: string
  kind: PublicServiceKind
  neighborhood: NeighborhoodKey
  offset: Offset
  icon: IconKey
  color: ColorKey
  institution?: InstitutionKey
  address: string
}

export const PUBLIC_SERVICES = {
  ubs: {
    id: 'svc_ubs_central',
    name: 'UBS Central',
    kind: 'health',
    neighborhood: 'centro',
    offset: [260, 320],
    icon: 'stethoscope',
    color: 'terracotta',
    institution: 'prefeitura',
    address: 'Rua da Saúde, 300 — Centro',
  },
  escola: {
    id: 'svc_escola_vila',
    name: 'Escola Municipal Paulo Freire',
    kind: 'education',
    neighborhood: 'vila',
    offset: [760, -520],
    icon: 'school',
    color: 'blue',
    institution: 'prefeitura',
    address: 'Rua dos Estudantes, 45 — Vila Esperança',
  },
  cras: {
    id: 'svc_cras',
    name: 'CRAS Jardim das Flores',
    kind: 'social',
    neighborhood: 'jardim',
    offset: [-560, 640],
    icon: 'hand-heart',
    color: 'orange',
    institution: 'prefeitura',
    address: 'Rua das Margaridas, 88 — Jardim das Flores',
  },
  biblioteca: {
    id: 'svc_biblioteca',
    name: 'Biblioteca Comunitária',
    kind: 'education',
    neighborhood: 'centro',
    offset: [-300, -40],
    icon: 'book',
    color: 'purple',
    institution: 'associacao',
    address: 'Praça da Matriz, 5 — Centro',
  },
  ecoponto: {
    id: 'svc_ecoponto',
    name: 'Ecoponto Parque das Águas',
    kind: 'environment',
    neighborhood: 'parque',
    offset: [520, 1420],
    icon: 'recycle',
    color: 'green',
    institution: 'prefeitura',
    address: 'Avenida das Nascentes, 500 — Parque das Águas',
  },
  centroEsportivo: {
    id: 'svc_centro_esportivo',
    name: 'Centro Esportivo Alto da Serra',
    kind: 'leisure',
    neighborhood: 'alto',
    offset: [-1260, -1040],
    icon: 'dumbbell',
    color: 'teal',
    institution: 'prefeitura',
    address: 'Rua do Mirante, 900 — Alto da Serra',
  },
  terminal: {
    id: 'svc_terminal',
    name: 'Terminal de Ônibus Central',
    kind: 'transport',
    neighborhood: 'centro',
    offset: [80, -420],
    icon: 'bus',
    color: 'blue',
    institution: 'prefeitura',
    address: 'Avenida Principal, 100 — Centro',
  },
  pracaCidadania: {
    id: 'svc_praca_cidadania',
    name: 'Posto de Atendimento ao Cidadão',
    kind: 'citizenship',
    neighborhood: 'centro',
    offset: [150, 140],
    icon: 'shield',
    color: 'gold',
    institution: 'prefeitura',
    address: 'Avenida Principal, 410 — Centro',
  },
} as const satisfies Record<string, CastPublicService>

/** Fonte exibida nos conteúdos editoriais demonstrativos. */
export const DEMO_NEWS_SOURCE = 'Redação NEXA · conteúdo demonstrativo'
