import type {
  AccessAudience,
  AccessibilityFeature,
  AccessPoint,
  AccessPointKind,
  ID,
  StopFeature,
  TransitFeature,
  TransitLine,
  TransitStop,
} from '@/types'

import {
  NEIGHBORHOODS,
  type BUSINESSES,
  type NeighborhoodKey,
  type Offset,
  type PUBLIC_SERVICES,
} from '../cast'
import type { SeedContext } from '../context'

/**
 * ACESSIBILIDADE E MOBILIDADE DA BASE DEMONSTRATIVA
 * ─────────────────────────────────────────────────────────────────────────────
 * Linhas de ônibus, paradas, barreiras e apoios no caminho, e os recursos de
 * acessibilidade dos locais. Tudo é FICTÍCIO: serve para demonstrar como a
 * informação ajuda pessoas com deficiência a planejar o deslocamento.
 */

// ── Recursos de acessibilidade dos locais ────────────────────────────────────

export const BUSINESS_ACCESSIBILITY: Record<keyof typeof BUSINESSES, AccessibilityFeature[]> = {
  padaria: ['step_free', 'wide_doors', 'priority_service'],
  farmacia: ['ramp', 'accessible_parking', 'priority_service', 'braille'],
  mercadinho: ['step_free', 'wide_doors', 'accessible_parking', 'priority_service'],
  restaurante: ['ramp', 'accessible_restroom', 'braille', 'priority_service'],
  salao: ['ramp', 'accessible_restroom'],
  tecnofix: ['step_free', 'libras'],
  atelie: [],
  pet: ['step_free'],
}

export const SERVICE_ACCESSIBILITY: Record<keyof typeof PUBLIC_SERVICES, AccessibilityFeature[]> = {
  ubs: [
    'ramp',
    'wide_doors',
    'accessible_restroom',
    'accessible_parking',
    'tactile_floor',
    'libras',
    'priority_service',
  ],
  escola: ['ramp', 'accessible_restroom'],
  cras: ['step_free', 'accessible_restroom', 'accessible_parking', 'libras', 'priority_service'],
  biblioteca: ['step_free', 'braille', 'audio_description', 'quiet_space'],
  ecoponto: ['step_free'],
  centroEsportivo: ['ramp', 'accessible_restroom', 'accessible_parking'],
  terminal: ['elevator', 'tactile_floor', 'accessible_restroom', 'priority_service'],
  pracaCidadania: ['step_free', 'libras', 'priority_service', 'braille'],
}

/** Recursos oferecidos em cada evento demonstrativo (pela chave de `EVENT_IDS`). */
export const EVENT_ACCESSIBILITY: Record<string, AccessibilityFeature[]> = {
  evt_01: ['step_free'],
  evt_02: ['step_free', 'accessible_restroom', 'libras'],
  evt_03: ['ramp', 'accessible_restroom', 'libras', 'priority_service'],
  evt_04: ['step_free', 'accessible_restroom'],
  evt_05: ['step_free', 'quiet_space'],
  evt_06: ['ramp', 'libras', 'audio_description'],
  evt_07: ['accessible_restroom', 'accessible_parking'],
  evt_08: [],
}

// ── Paradas de ônibus ────────────────────────────────────────────────────────

interface StopRow {
  id: ID
  name: string
  addressHint: string
  neighborhood: NeighborhoodKey
  offset: Offset
  features: StopFeature[]
}

const STOPS = {
  terminal: {
    id: 'stp_terminal',
    name: 'Terminal Central',
    addressHint: 'Avenida Principal, 100 — plataforma A',
    neighborhood: 'centro',
    offset: [80, -420],
    features: ['shelter', 'bench', 'tactile_paving', 'level_boarding', 'audio_info'],
  },
  matriz: {
    id: 'stp_matriz',
    name: 'Praça da Matriz',
    addressHint: 'Praça da Matriz, em frente à biblioteca',
    neighborhood: 'centro',
    offset: [-260, 20],
    features: ['shelter', 'bench', 'tactile_paving'],
  },
  ubs: {
    id: 'stp_ubs',
    name: 'UBS Central',
    addressHint: 'Rua da Saúde, 300',
    neighborhood: 'centro',
    offset: [280, 300],
    features: ['shelter', 'bench', 'tactile_paving', 'level_boarding'],
  },
  escola: {
    id: 'stp_escola',
    name: 'Escola Paulo Freire',
    addressHint: 'Rua dos Estudantes, 45',
    neighborhood: 'vila',
    offset: [780, -560],
    features: ['shelter', 'bench'],
  },
  acacias: {
    id: 'stp_acacias',
    name: 'Rua das Acácias',
    addressHint: 'Rua das Acácias, 100 — perto da padaria',
    neighborhood: 'vila',
    offset: [1150, -330],
    features: ['shelter', 'tactile_paving', 'level_boarding'],
  },
  saoJose: {
    id: 'stp_sao_jose',
    name: 'Praça São José',
    addressHint: 'Praça São José',
    neighborhood: 'saoJose',
    offset: [1900, -200],
    features: ['shelter', 'bench'],
  },
  primavera: {
    id: 'stp_primavera',
    name: 'Jardim Primavera',
    addressHint: 'Avenida das Flores, ponto final',
    neighborhood: 'primavera',
    offset: [2600, 600],
    features: ['bench'],
  },
  flores: {
    id: 'stp_flores',
    name: 'Praça do Jardim das Flores',
    addressHint: 'Praça do Jardim das Flores',
    neighborhood: 'jardim',
    offset: [-760, 860],
    features: ['shelter', 'bench', 'tactile_paving', 'audio_info'],
  },
  cras: {
    id: 'stp_cras',
    name: 'CRAS Jardim das Flores',
    addressHint: 'Rua das Margaridas, em frente ao CRAS',
    neighborhood: 'jardim',
    offset: [-580, 660],
    features: ['shelter', 'level_boarding'],
  },
  santaClara: {
    id: 'stp_santa_clara',
    name: 'Santa Clara',
    addressHint: 'Avenida Santa Clara, 800',
    neighborhood: 'santaClara',
    offset: [-1900, 300],
    features: ['shelter'],
  },
  operaria: {
    id: 'stp_operaria',
    name: 'Vila Operária',
    addressHint: 'Rua dos Tecelões, ponto final',
    neighborhood: 'operaria',
    offset: [-3300, 500],
    features: ['bench'],
  },
  parque: {
    id: 'stp_parque',
    name: 'Parque das Águas',
    addressHint: 'Avenida das Nascentes, entrada do parque',
    neighborhood: 'parque',
    offset: [720, 1080],
    features: ['shelter', 'bench', 'tactile_paving', 'level_boarding'],
  },
  uniao: {
    id: 'stp_uniao',
    name: 'Vila União',
    addressHint: 'Rua da União, 250',
    neighborhood: 'uniao',
    offset: [200, 2100],
    features: ['bench'],
  },
  mirante: {
    id: 'stp_mirante',
    name: 'Mirante do Alto da Serra',
    addressHint: 'Rua do Mirante, 900',
    neighborhood: 'alto',
    offset: [-980, -880],
    features: [],
  },
  boaVista: {
    id: 'stp_boa_vista',
    name: 'Boa Vista',
    addressHint: 'Rua Boa Vista, 60',
    neighborhood: 'boaVista',
    offset: [-450, -350],
    features: ['shelter'],
  },
  saoFrancisco: {
    id: 'stp_sao_francisco',
    name: 'São Francisco',
    addressHint: 'Largo São Francisco',
    neighborhood: 'saoFrancisco',
    offset: [300, -2000],
    features: ['shelter', 'bench'],
  },
} as const satisfies Record<string, StopRow>

type StopKey = keyof typeof STOPS

export function buildTransitStops(ctx: SeedContext): TransitStop[] {
  return Object.values(STOPS).map((stop) => ({
    id: stop.id,
    name: stop.name,
    addressHint: stop.addressHint,
    neighborhoodId: NEIGHBORHOODS[stop.neighborhood].id,
    location: ctx.point(stop.offset),
    features: [...stop.features],
  }))
}

// ── Linhas de ônibus ─────────────────────────────────────────────────────────

interface LineRow {
  id: ID
  code: string
  name: string
  stops: StopKey[]
  fleet: TransitLine['fleet']
  features: TransitFeature[]
  frequencyMinutes: number
  firstDeparture: string
  lastDeparture: string
  note?: string
}

const LINES: LineRow[] = [
  {
    id: 'lin_101',
    code: '101',
    name: 'Vila Esperança ⇄ Centro',
    stops: ['acacias', 'escola', 'terminal'],
    fleet: 'all',
    features: [
      'lift',
      'low_floor',
      'wheelchair_space',
      'audio_announcements',
      'visual_display',
      'priority_seats',
    ],
    frequencyMinutes: 15,
    firstDeparture: '05:30',
    lastDeparture: '23:00',
  },
  {
    id: 'lin_102',
    code: '102',
    name: 'Jardim Primavera ⇄ Centro',
    stops: ['primavera', 'saoJose', 'acacias', 'ubs', 'terminal'],
    fleet: 'all',
    features: ['lift', 'wheelchair_space', 'visual_display', 'priority_seats'],
    frequencyMinutes: 20,
    firstDeparture: '05:40',
    lastDeparture: '22:30',
    note: 'Passa em frente à UBS Central.',
  },
  {
    id: 'lin_201',
    code: '201',
    name: 'Jardim das Flores ⇄ Centro',
    stops: ['flores', 'cras', 'matriz', 'terminal'],
    fleet: 'all',
    features: [
      'low_floor',
      'wheelchair_space',
      'audio_announcements',
      'visual_display',
      'priority_seats',
    ],
    frequencyMinutes: 12,
    firstDeparture: '05:20',
    lastDeparture: '23:30',
  },
  {
    id: 'lin_202',
    code: '202',
    name: 'Vila Operária ⇄ Centro',
    stops: ['operaria', 'santaClara', 'matriz', 'terminal'],
    fleet: 'partial',
    features: ['lift', 'wheelchair_space', 'priority_seats'],
    frequencyMinutes: 30,
    firstDeparture: '06:00',
    lastDeparture: '21:00',
    note: 'Em média, um a cada dois ônibus desta linha tem elevador. A próxima partida acessível pode demorar até 60 minutos.',
  },
  {
    id: 'lin_301',
    code: '301',
    name: 'Vila União ⇄ Centro',
    stops: ['uniao', 'parque', 'ubs', 'terminal'],
    fleet: 'all',
    features: ['low_floor', 'wheelchair_space', 'audio_announcements', 'priority_seats'],
    frequencyMinutes: 20,
    firstDeparture: '05:45',
    lastDeparture: '22:45',
  },
  {
    id: 'lin_401',
    code: '401',
    name: 'Alto da Serra ⇄ Centro',
    stops: ['mirante', 'boaVista', 'terminal'],
    fleet: 'none',
    features: ['priority_seats'],
    frequencyMinutes: 40,
    firstDeparture: '06:10',
    lastDeparture: '20:10',
    note: 'Os micro-ônibus desta linha não têm elevador nem piso baixo. Alternativa acessível: linha 402, a partir da parada Boa Vista.',
  },
  {
    id: 'lin_402',
    code: '402',
    name: 'São Francisco ⇄ Centro',
    stops: ['saoFrancisco', 'boaVista', 'terminal'],
    fleet: 'partial',
    features: ['lift', 'wheelchair_space', 'visual_display', 'priority_seats'],
    frequencyMinutes: 30,
    firstDeparture: '06:00',
    lastDeparture: '22:00',
    note: 'Os ônibus com elevador saem nas partidas das horas cheias.',
  },
  {
    id: 'lin_500',
    code: '500',
    name: 'Circular dos Serviços',
    stops: ['terminal', 'ubs', 'parque', 'flores', 'cras', 'matriz'],
    fleet: 'all',
    features: [
      'lift',
      'low_floor',
      'wheelchair_space',
      'audio_announcements',
      'visual_display',
      'priority_seats',
    ],
    frequencyMinutes: 25,
    firstDeparture: '06:30',
    lastDeparture: '20:30',
    note: 'Liga o terminal à UBS, ao CRAS e às praças.',
  },
]

export function buildTransitLines(): TransitLine[] {
  return LINES.map((line) => ({
    id: line.id,
    code: line.code,
    name: line.name,
    stopIds: line.stops.map((key) => STOPS[key].id),
    fleet: line.fleet,
    features: [...line.features],
    frequencyMinutes: line.frequencyMinutes,
    firstDeparture: line.firstDeparture,
    lastDeparture: line.lastDeparture,
    ...(line.note ? { note: line.note } : {}),
    isDemo: true,
  }))
}

// ── Barreiras e apoios no caminho ────────────────────────────────────────────

interface PointRow {
  id: ID
  kind: AccessPointKind
  title: string
  description: string
  addressHint: string
  neighborhood: NeighborhoodKey
  offset: Offset
  alternative?: string
  audiences: AccessAudience[]
  checkedDaysAgo: number
}

const POINTS: PointRow[] = [
  {
    id: 'acp_escadaria_mirante',
    kind: 'stairs',
    title: 'Escadaria do Mirante',
    description:
      'Escadaria com 48 degraus. Parte do trecho não tem corrimão e não há piso tátil de alerta no topo.',
    addressHint: 'Rua do Mirante, acesso à Rua das Palmeiras',
    neighborhood: 'alto',
    offset: [-930, -830],
    alternative:
      'Contorne pela Rua das Palmeiras: o caminho é cerca de 250 m mais longo, em rampa suave.',
    audiences: ['blind', 'low_vision', 'wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 6,
  },
  {
    id: 'acp_passarela_terminal',
    kind: 'stairs',
    title: 'Passarela da Avenida Principal',
    description: 'Passarela com escadas nos dois lados e sem elevador.',
    addressHint: 'Avenida Principal, ao lado do Terminal Central',
    neighborhood: 'centro',
    offset: [150, -520],
    alternative:
      'Use a faixa de pedestres com semáforo sonoro em frente ao Terminal Central, a cerca de 120 m.',
    audiences: ['wheelchair', 'reduced_mobility', 'blind'],
    checkedDaysAgo: 3,
  },
  {
    id: 'acp_escada_escola',
    kind: 'stairs',
    title: 'Escada lateral da Escola Paulo Freire',
    description: 'Atalho com 12 degraus e corrimão de um lado só.',
    addressHint: 'Travessa da Escola, entre a Rua dos Estudantes e a Rua das Acácias',
    neighborhood: 'vila',
    offset: [820, -470],
    alternative: 'A entrada principal, pela Rua dos Estudantes, tem rampa.',
    audiences: ['blind', 'wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 9,
  },
  {
    id: 'acp_degraus_matriz',
    kind: 'steps',
    title: 'Degraus na entrada da Praça da Matriz',
    description:
      'Três degraus sem rampa no acesso pela Rua do Comércio. Não há sinalização tátil antes do desnível.',
    addressHint: 'Praça da Matriz, acesso pela Rua do Comércio',
    neighborhood: 'centro',
    offset: [-200, 110],
    alternative: 'A entrada em frente à biblioteca é plana e tem piso tátil.',
    audiences: ['blind', 'low_vision', 'wheelchair'],
    checkedDaysAgo: 4,
  },
  {
    id: 'acp_degrau_saude',
    kind: 'steps',
    title: 'Degrau na calçada da Rua da Saúde',
    description: 'Desnível de cerca de 15 cm entre duas calçadas vizinhas, sem rampa.',
    addressHint: 'Rua da Saúde, altura do número 260',
    neighborhood: 'centro',
    offset: [240, 350],
    alternative: 'A rampa da entrada principal da UBS fica 40 m adiante.',
    audiences: ['wheelchair', 'blind', 'reduced_mobility'],
    checkedDaysAgo: 2,
  },
  {
    id: 'acp_calcada_acacias',
    kind: 'broken_sidewalk',
    title: 'Calçada danificada na Rua das Acácias',
    description: 'Trecho de 30 m com piso solto e buracos, perto da padaria.',
    addressHint: 'Rua das Acácias, entre os números 130 e 160',
    neighborhood: 'vila',
    offset: [1230, -290],
    alternative: 'A calçada do outro lado da rua está em bom estado.',
    audiences: ['blind', 'low_vision', 'wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 5,
  },
  {
    id: 'acp_obstaculo_flores',
    kind: 'obstacle',
    title: 'Poste e lixeira no meio da calçada',
    description: 'A passagem livre entre o poste e o muro tem menos de 60 cm.',
    addressHint: 'Rua das Margaridas, altura do número 80',
    neighborhood: 'jardim',
    offset: [-700, 760],
    alternative: 'Atravesse na faixa em frente à praça e siga pela calçada oposta.',
    audiences: ['blind', 'wheelchair'],
    checkedDaysAgo: 8,
  },
  {
    id: 'acp_ladeira_serra',
    kind: 'steep_slope',
    title: 'Ladeira da Rua da Serra',
    description: 'Subida forte por cerca de 200 m, sem patamar de descanso.',
    addressHint: 'Rua da Serra, entre a Rua Boa Vista e a Rua do Mirante',
    neighborhood: 'alto',
    offset: [-760, -640],
    alternative: 'A linha 402 chega à parada Boa Vista, no início da subida.',
    audiences: ['wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 12,
  },
  {
    id: 'acp_travessia_nascentes',
    kind: 'unsafe_crossing',
    title: 'Travessia sem sinal sonoro',
    description: 'Cruzamento movimentado com semáforo apenas visual e tempo curto para pedestres.',
    addressHint: 'Avenida das Nascentes com a Rua do Lago',
    neighborhood: 'parque',
    offset: [600, 960],
    alternative: 'Há semáforo sonoro na entrada do Parque das Águas, a cerca de 150 m.',
    audiences: ['blind', 'low_vision'],
    checkedDaysAgo: 7,
  },
  {
    id: 'acp_rampa_ubs',
    kind: 'ramp',
    title: 'Rampa da UBS Central',
    description: 'Rampa com corrimão dos dois lados na entrada principal.',
    addressHint: 'Rua da Saúde, 300',
    neighborhood: 'centro',
    offset: [262, 322],
    audiences: ['wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 2,
  },
  {
    id: 'acp_rampas_flores',
    kind: 'ramp',
    title: 'Rampas na Praça do Jardim das Flores',
    description: 'Rampas nas quatro esquinas da praça, com rebaixamento da calçada.',
    addressHint: 'Praça do Jardim das Flores',
    neighborhood: 'jardim',
    offset: [-800, 900],
    audiences: ['wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 10,
  },
  {
    id: 'acp_elevador_terminal',
    kind: 'elevator',
    title: 'Elevador do Terminal Central',
    description:
      'Liga a plataforma de embarque ao piso da rua. Tem botões em braille e aviso sonoro de andar.',
    addressHint: 'Terminal Central, ao lado da bilheteria',
    neighborhood: 'centro',
    offset: [95, -400],
    audiences: ['wheelchair', 'reduced_mobility', 'blind'],
    checkedDaysAgo: 1,
  },
  {
    id: 'acp_semaforo_terminal',
    kind: 'audio_signal',
    title: 'Semáforo sonoro do Terminal Central',
    description: 'Faixa de pedestres com sinal sonoro e botão com vibração.',
    addressHint: 'Avenida Principal, em frente ao Terminal Central',
    neighborhood: 'centro',
    offset: [40, -440],
    audiences: ['blind', 'low_vision'],
    checkedDaysAgo: 3,
  },
  {
    id: 'acp_semaforo_parque',
    kind: 'audio_signal',
    title: 'Semáforo sonoro do Parque das Águas',
    description: 'Travessia com sinal sonoro na entrada principal do parque.',
    addressHint: 'Avenida das Nascentes, entrada do parque',
    neighborhood: 'parque',
    offset: [740, 1110],
    audiences: ['blind', 'low_vision'],
    checkedDaysAgo: 7,
  },
  {
    id: 'acp_piso_matriz',
    kind: 'tactile_paving',
    title: 'Piso tátil na Praça da Matriz',
    description: 'Faixa direcional que liga a parada de ônibus à biblioteca e ao centro da praça.',
    addressHint: 'Praça da Matriz',
    neighborhood: 'centro',
    offset: [-280, 0],
    audiences: ['blind', 'low_vision'],
    checkedDaysAgo: 4,
  },
  {
    id: 'acp_piso_acacias',
    kind: 'tactile_paving',
    title: 'Piso tátil na parada Rua das Acácias',
    description: 'Piso de alerta na borda da calçada e faixa direcional até o abrigo.',
    addressHint: 'Rua das Acácias, 100',
    neighborhood: 'vila',
    offset: [1140, -345],
    audiences: ['blind', 'low_vision'],
    checkedDaysAgo: 5,
  },
  {
    id: 'acp_banheiro_parque',
    kind: 'accessible_restroom',
    title: 'Banheiro acessível do Parque das Águas',
    description: 'Banheiro com barras de apoio e porta larga, ao lado da administração.',
    addressHint: 'Parque das Águas, perto da entrada principal',
    neighborhood: 'parque',
    offset: [690, 1160],
    audiences: ['wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 11,
  },
  {
    id: 'acp_vagas_cras',
    kind: 'accessible_parking',
    title: 'Vagas reservadas no CRAS',
    description: 'Duas vagas para pessoas com deficiência, com rampa de acesso à calçada.',
    addressHint: 'Rua das Margaridas, em frente ao CRAS',
    neighborhood: 'jardim',
    offset: [-565, 625],
    audiences: ['wheelchair', 'reduced_mobility'],
    checkedDaysAgo: 9,
  },
]

export function buildAccessPoints(ctx: SeedContext): AccessPoint[] {
  return POINTS.map((point) => ({
    id: point.id,
    kind: point.kind,
    title: point.title,
    description: point.description,
    addressHint: point.addressHint,
    neighborhoodId: NEIGHBORHOODS[point.neighborhood].id,
    location: ctx.point(point.offset),
    ...(point.alternative ? { alternative: point.alternative } : {}),
    audiences: [...point.audiences],
    checkedAt: ctx.at(-point.checkedDaysAgo, 10),
    isDemo: true,
  }))
}
