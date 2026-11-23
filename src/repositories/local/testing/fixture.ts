import {
  DATABASE_SCHEMA_VERSION,
  type AvatarSpec,
  type Database,
  type User,
  type UserRole,
  type WeekSchedule,
} from '@/types'
import { offsetPoint } from '@/utils/geo'

import { defaultSettings } from '../context'

/**
 * BASE MÍNIMA PARA TESTES AUTOMATIZADOS
 * ─────────────────────────────────────────────────────────────────────────────
 * Um banco pequeno e previsível, independente da base demonstrativa, com um
 * usuário de cada perfil e os registros essenciais para exercitar as regras de
 * negócio. Os testes criam o restante (publicações, demandas, vendas…).
 */

/** Meio-dia de uma quarta-feira, no fuso do ambiente de teste. */
export const FIXTURE_NOW = new Date(2026, 10, 18, 12, 0, 0, 0)

export const FIXTURE_CENTER = { lat: -19.932, lng: -43.9381 }

export const FIXTURE = {
  neighborhoods: { centro: 'nb_centro', vila: 'nb_vila' },
  users: {
    /** Moradora da Vila. */
    resident: 'usr_res',
    /** Morador do Centro. */
    resident2: 'usr_res2',
    /** Comerciante, proprietária de `business`. */
    merchant: 'usr_mer',
    /** Comerciante ainda sem estabelecimento. */
    merchantWithoutBusiness: 'usr_mer2',
    /** Representa `institutions.cityHall`. */
    institution: 'usr_ins',
    /** Representa `institutions.ngo`. */
    institution2: 'usr_ins2',
    admin: 'usr_adm',
    /** Conta suspensa pela administração. */
    suspended: 'usr_sus',
  },
  categories: {
    /** Demanda com instituição padrão (`institutions.cityHall`). */
    pothole: 'cat_dem_buraco',
    /** Demanda sem instituição padrão. */
    otherDemand: 'cat_dem_outros',
    /** Categoria de demanda desativada. */
    inactiveDemand: 'cat_dem_inativa',
    food: 'cat_biz_alimentacao',
    services: 'cat_biz_servicos',
    culture: 'cat_evt_cultura',
  },
  institutions: { cityHall: 'ins_prefeitura', ngo: 'ins_ong', unverified: 'ins_pendente' },
  services: { clinic: 'svc_ubs' },
  business: 'biz_padaria',
  products: {
    /** R$ 1,00 · estoque 50 · mínimo 10. */
    bread: 'prd_pao',
    /** R$ 25,00 · estoque 2 · mínimo 2 (no limite do estoque baixo). */
    cake: 'prd_bolo',
    /** R$ 5,00 · sem controle de estoque. */
    coffee: 'prd_cafe',
    /** Produto desativado. */
    inactive: 'prd_inativo',
  },
  news: 'nws_onibus',
  mobility: {
    /** Parada no Centro, com piso tátil. */
    stopCentro: 'stp_centro',
    /** Parada na Vila, sem recursos. */
    stopVila: 'stp_vila',
    /** Linha com toda a frota acessível (06:00–22:00, a cada 30 min). */
    accessibleLine: 'lin_10',
    /** Linha sem ônibus acessíveis. */
    inaccessibleLine: 'lin_20',
    /** Escadaria no Centro (barreira), a ~200 m do centro do mapa. */
    stairs: 'acp_escada',
    /** Rampa na Vila (apoio). */
    ramp: 'acp_rampa',
  },
} as const

const AVATAR: AvatarSpec = {
  skin: 'medium',
  hair: 'short',
  hairColor: 'black',
  top: 'green',
  background: 'mint',
}

const EVERY_DAY_BUT_SUNDAY: WeekSchedule = [
  null,
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
]

export function buildFixtureDatabase(now: Date = FIXTURE_NOW): Database {
  const createdAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const seededAt = now.toISOString()

  const user = (
    id: string,
    name: string,
    role: UserRole,
    neighborhoodId: string,
    extra: Partial<User> = {},
  ): User => ({
    id,
    name,
    username: id.replace('usr_', 'pessoa_'),
    email: `${id.replace('usr_', '')}@teste.nexa.demo`,
    role,
    neighborhoodId,
    avatar: { ...AVATAR },
    status: 'active',
    isDemoAccount: false,
    createdAt,
    ...extra,
  })

  const users: User[] = [
    user(FIXTURE.users.resident, 'Rita Moradora', 'resident', FIXTURE.neighborhoods.vila),
    user(FIXTURE.users.resident2, 'Tiago Vizinho', 'resident', FIXTURE.neighborhoods.centro),
    user(FIXTURE.users.merchant, 'Marta Comerciante', 'merchant', FIXTURE.neighborhoods.vila, {
      businessId: FIXTURE.business,
    }),
    user(
      FIXTURE.users.merchantWithoutBusiness,
      'Caio Sem Loja',
      'merchant',
      FIXTURE.neighborhoods.centro,
    ),
    user(
      FIXTURE.users.institution,
      'Inês Prefeitura',
      'institution',
      FIXTURE.neighborhoods.centro,
      {
        institutionId: FIXTURE.institutions.cityHall,
      },
    ),
    user(FIXTURE.users.institution2, 'Otto Ong', 'institution', FIXTURE.neighborhoods.centro, {
      institutionId: FIXTURE.institutions.ngo,
    }),
    user(FIXTURE.users.admin, 'Ada Admin', 'admin', FIXTURE.neighborhoods.centro),
    user(FIXTURE.users.suspended, 'Sara Suspensa', 'resident', FIXTURE.neighborhoods.centro, {
      status: 'suspended',
    }),
  ]

  return {
    meta: {
      schemaVersion: DATABASE_SCHEMA_VERSION,
      seededAt,
      rebasedAt: seededAt,
      demandSequence: 0,
    },
    neighborhoods: [
      { id: FIXTURE.neighborhoods.centro, name: 'Centro', center: FIXTURE_CENTER },
      {
        id: FIXTURE.neighborhoods.vila,
        name: 'Vila Esperança',
        center: offsetPoint(FIXTURE_CENTER, 900, -700),
      },
    ],
    users,
    credentials: [],
    passwordResets: [],
    userSettings: users.map((entry) => defaultSettings(entry.id, createdAt)),
    categories: [
      {
        id: FIXTURE.categories.pothole,
        kind: 'demand',
        name: 'Buraco na rua',
        icon: 'pothole',
        color: 'terracotta',
        active: true,
        system: true,
        order: 1,
        defaultInstitutionId: FIXTURE.institutions.cityHall,
      },
      {
        id: FIXTURE.categories.otherDemand,
        kind: 'demand',
        name: 'Outros',
        icon: 'more',
        color: 'gray',
        active: true,
        system: true,
        order: 2,
      },
      {
        id: FIXTURE.categories.inactiveDemand,
        kind: 'demand',
        name: 'Categoria desativada',
        icon: 'alert',
        color: 'gold',
        active: false,
        system: false,
        order: 3,
      },
      {
        id: FIXTURE.categories.food,
        kind: 'business',
        name: 'Alimentação',
        icon: 'utensils',
        color: 'orange',
        active: true,
        system: true,
        order: 1,
      },
      {
        id: FIXTURE.categories.services,
        kind: 'business',
        name: 'Serviços',
        icon: 'wrench',
        color: 'blue',
        active: true,
        system: true,
        order: 2,
      },
      {
        id: FIXTURE.categories.culture,
        kind: 'event',
        name: 'Cultura',
        icon: 'music',
        color: 'purple',
        active: true,
        system: true,
        order: 1,
      },
    ],
    posts: [],
    comments: [],
    reports: [],
    demands: [],
    businesses: [
      {
        id: FIXTURE.business,
        ownerId: FIXTURE.users.merchant,
        name: 'Padaria Teste',
        categoryId: FIXTURE.categories.food,
        description: 'Pães e bolos fresquinhos todos os dias.',
        illustration: 'bakery',
        gallery: [],
        address: 'Rua das Acácias, 120 — Vila Esperança',
        neighborhoodId: FIXTURE.neighborhoods.vila,
        // 500 m do centro da Vila Esperança.
        location: offsetPoint(FIXTURE_CENTER, 1200, -300),
        phone: '00900000001',
        schedule: EVERY_DAY_BUT_SUNDAY,
        tags: ['Aceita Pix'],
        settings: { allowNegativeStock: false },
        isDemo: true,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    reviews: [],
    favorites: [],
    products: [
      {
        id: FIXTURE.products.bread,
        businessId: FIXTURE.business,
        name: 'Pão francês',
        group: 'Pães',
        priceCents: 100,
        costCents: 40,
        trackStock: true,
        stock: 50,
        minStock: 10,
        unit: 'un',
        showInCatalog: true,
        active: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: FIXTURE.products.cake,
        businessId: FIXTURE.business,
        name: 'Bolo de cenoura',
        group: 'Bolos',
        priceCents: 2500,
        costCents: 1100,
        trackStock: true,
        stock: 2,
        minStock: 2,
        unit: 'un',
        showInCatalog: true,
        active: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: FIXTURE.products.coffee,
        businessId: FIXTURE.business,
        name: 'Café coado',
        group: 'Bebidas',
        priceCents: 500,
        trackStock: false,
        stock: 0,
        minStock: 0,
        unit: 'un',
        showInCatalog: true,
        active: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: FIXTURE.products.inactive,
        businessId: FIXTURE.business,
        name: 'Sonho (fora de linha)',
        priceCents: 600,
        trackStock: true,
        stock: 5,
        minStock: 1,
        unit: 'un',
        showInCatalog: false,
        active: false,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    sales: [],
    transactions: [],
    institutions: [
      {
        id: FIXTURE.institutions.cityHall,
        name: 'Prefeitura Municipal',
        category: 'city_hall',
        tagline: 'Serviços e informações',
        description: 'Instituição de teste responsável por demandas de infraestrutura.',
        areas: ['Infraestrutura'],
        services: ['Atendimento ao cidadão'],
        neighborhoodId: FIXTURE.neighborhoods.centro,
        location: offsetPoint(FIXTURE_CENTER, 120, 80),
        icon: 'landmark',
        color: 'green',
        verified: true,
        isDemo: true,
        createdAt,
      },
      {
        id: FIXTURE.institutions.ngo,
        name: 'ONG Viva Melhor',
        category: 'ngo',
        tagline: 'Projetos sociais',
        description: 'Organização de teste com projetos sociais.',
        areas: ['Assistência social'],
        services: ['Doações'],
        icon: 'hand-heart',
        color: 'orange',
        verified: true,
        isDemo: true,
        createdAt,
      },
      {
        id: FIXTURE.institutions.unverified,
        name: 'Coletivo em Análise',
        category: 'community_association',
        tagline: 'Aguardando verificação',
        description: 'Instituição ainda não verificada pela administração.',
        areas: [],
        services: [],
        icon: 'users',
        color: 'teal',
        verified: false,
        isDemo: false,
        createdAt,
      },
    ],
    initiatives: [],
    publicServices: [
      {
        id: FIXTURE.services.clinic,
        name: 'UBS Central',
        kind: 'health',
        description: 'Unidade básica de saúde de teste.',
        address: 'Rua da Saúde, 300 — Centro',
        neighborhoodId: FIXTURE.neighborhoods.centro,
        location: offsetPoint(FIXTURE_CENTER, 260, 320),
        hours: 'Seg a sex, 7h às 17h',
        institutionId: FIXTURE.institutions.cityHall,
        icon: 'stethoscope',
        color: 'terracotta',
      },
    ],
    events: [],
    notifications: [],
    news: [
      {
        id: FIXTURE.news,
        title: 'Novo ponto de ônibus no centro!',
        summary: 'Parada coberta passa a atender três linhas.',
        body: ['Texto de teste.'],
        tag: 'Mobilidade',
        illustration: 'bus-stop',
        publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        source: 'Redação NEXA · conteúdo demonstrativo',
      },
    ],
    aiConversations: [],
    transitStops: [
      {
        id: FIXTURE.mobility.stopCentro,
        name: 'Terminal Central',
        addressHint: 'Avenida Principal, 100',
        neighborhoodId: FIXTURE.neighborhoods.centro,
        location: offsetPoint(FIXTURE_CENTER, 80, -100),
        features: ['shelter', 'tactile_paving'],
      },
      {
        id: FIXTURE.mobility.stopVila,
        name: 'Rua das Acácias',
        addressHint: 'Rua das Acácias, 100',
        neighborhoodId: FIXTURE.neighborhoods.vila,
        location: offsetPoint(FIXTURE_CENTER, 950, -650),
        features: [],
      },
    ],
    transitLines: [
      {
        id: FIXTURE.mobility.accessibleLine,
        code: '10',
        name: 'Vila Esperança ⇄ Centro',
        stopIds: [FIXTURE.mobility.stopVila, FIXTURE.mobility.stopCentro],
        fleet: 'all',
        features: ['lift', 'audio_announcements'],
        frequencyMinutes: 30,
        firstDeparture: '06:00',
        lastDeparture: '22:00',
        isDemo: true,
      },
      {
        id: FIXTURE.mobility.inaccessibleLine,
        code: '20',
        name: 'Circular da Vila',
        stopIds: [FIXTURE.mobility.stopVila],
        fleet: 'none',
        features: ['priority_seats'],
        frequencyMinutes: 60,
        firstDeparture: '07:00',
        lastDeparture: '19:00',
        note: 'Sem elevador.',
        isDemo: true,
      },
    ],
    accessPoints: [
      {
        id: FIXTURE.mobility.stairs,
        kind: 'stairs',
        title: 'Escadaria da praça',
        description: 'Escadaria com 20 degraus.',
        addressHint: 'Praça da Matriz',
        neighborhoodId: FIXTURE.neighborhoods.centro,
        location: offsetPoint(FIXTURE_CENTER, 200, 0),
        alternative: 'Use a rampa da rua lateral.',
        audiences: ['blind', 'wheelchair'],
        checkedAt: createdAt,
        isDemo: true,
      },
      {
        id: FIXTURE.mobility.ramp,
        kind: 'ramp',
        title: 'Rampa da escola',
        description: 'Rampa com corrimão.',
        addressHint: 'Rua dos Estudantes, 45',
        neighborhoodId: FIXTURE.neighborhoods.vila,
        location: offsetPoint(FIXTURE_CENTER, 900, -700),
        audiences: ['wheelchair'],
        checkedAt: createdAt,
        isDemo: true,
      },
    ],
  }
}
