import type { CommunityEvent, EventOrganizer, GeoPoint, ID, IllustrationKey } from '@/types'

import {
  BUSINESSES,
  EVENT_CATEGORIES,
  INSTITUTIONS,
  NEIGHBORHOODS,
  PEOPLE,
  PUBLIC_SERVICES,
  type NeighborhoodKey,
  type PersonKey,
} from '../cast'
import type { SeedContext } from '../context'
import { EVENT_ACCESSIBILITY } from '../core/mobility'
import { around, near, pickPeople, uid } from './shared'

/** Ids fixos dos eventos (usados por posts, notícias e notificações). */
export const EVENT_IDS = {
  mutirao: 'evt_01',
  feira: 'evt_02',
  saude: 'evt_03',
  campanha: 'evt_04',
  oficina: 'evt_05',
  sarau: 'evt_06',
  torneio: 'evt_07',
  brecho: 'evt_08',
} as const

const user = (key: PersonKey): EventOrganizer => ({
  kind: 'user',
  id: uid(key),
  name: PEOPLE[key].name,
})
const institution = (key: keyof typeof INSTITUTIONS): EventOrganizer => ({
  kind: 'institution',
  id: INSTITUTIONS[key].id,
  name: INSTITUTIONS[key].name,
})

interface Row {
  id: ID
  title: string
  description: string
  category: keyof typeof EVENT_CATEGORIES
  illustration: IllustrationKey
  /** Dia relativo a hoje e horários de início e término. */
  day: number
  from: number
  to: number
  venue: string
  address: string
  neighborhood: NeighborhoodKey
  location: GeoPoint
  organizer: EventOrganizer
  createdBy: PersonKey
  /** Quantidade de confirmados e dias desde a criação do evento. */
  attendees: number
  createdDaysAgo: number
  capacity?: number
  /** Pessoas que obrigatoriamente constam como confirmadas. */
  include?: PersonKey[]
}

function rows(ctx: SeedContext): Row[] {
  const at = (key: keyof typeof PUBLIC_SERVICES, north = 0, east = 0): GeoPoint =>
    around(ctx, PUBLIC_SERVICES[key].offset, north, east)

  return [
    {
      id: EVENT_IDS.mutirao,
      title: 'Mutirão de Revitalização da Praça',
      description:
        'Vamos cuidar juntos da nossa praça! Haverá plantio de mudas, pintura dos bancos, limpeza dos canteiros e recolhimento de entulho. Traga luvas, chapéu e disposição; as ferramentas e o lanche ficam por conta da organização. Crianças são bem-vindas e terão uma oficina de plantio.',
      category: 'environment',
      illustration: 'cleanup',
      day: 1,
      from: 8,
      to: 12,
      venue: 'Praça do Jardim das Flores',
      address: 'Praça do Jardim das Flores, s/nº — Jardim das Flores',
      neighborhood: 'jardim',
      location: near(ctx, 'jardim', 40, -60),
      organizer: user('ana'),
      createdBy: 'ana',
      attendees: 9,
      createdDaysAgo: 3,
      include: ['antonio', 'ana'],
    },
    {
      id: EVENT_IDS.feira,
      title: 'Feira de Empreendedorismo',
      description:
        'Uma manhã e uma tarde de oportunidades para quem empreende ou quer começar. Haverá estandes de pequenos negócios do bairro, rodadas de orientação para quem está começando, palestras curtas sobre gestão e vendas e espaço para trocar contatos. Entrada gratuita.',
      category: 'entrepreneurship',
      illustration: 'fair',
      day: 3,
      from: 9,
      to: 17,
      venue: 'Centro da Cidade',
      address: 'Praça da Matriz, s/nº — Centro',
      neighborhood: 'centro',
      location: near(ctx, 'centro', -20, 30),
      organizer: institution('associacao'),
      createdBy: 'jorge',
      attendees: 12,
      createdDaysAgo: 6,
    },
    {
      id: EVENT_IDS.saude,
      title: 'Mutirão de Saúde',
      description:
        'Dia de cuidar da saúde na UBS Central: aferição de pressão e glicemia, avaliação nutricional, orientação odontológica, atualização da caderneta de vacinação e palestras sobre prevenção. Traga um documento com foto e o cartão de vacinação.',
      category: 'health',
      illustration: 'health',
      day: 6,
      from: 8,
      to: 14,
      venue: 'UBS Central',
      address: PUBLIC_SERVICES.ubs.address,
      neighborhood: 'centro',
      location: at('ubs'),
      organizer: institution('prefeitura'),
      createdBy: 'roberto',
      attendees: 18,
      createdDaysAgo: 5,
    },
    {
      id: EVENT_IDS.campanha,
      title: 'Campanha de Arrecadação de Alimentos',
      description:
        'A ONG Viva Melhor recebe alimentos não perecíveis (arroz, feijão, macarrão, óleo, leite em pó e enlatados) para montar cestas básicas para famílias do bairro. Venha doar, ajudar na triagem ou divulgar a campanha entre os vizinhos.',
      category: 'solidarity',
      illustration: 'donation',
      day: 9,
      from: 9,
      to: 16,
      venue: 'CRAS Jardim das Flores',
      address: PUBLIC_SERVICES.cras.address,
      neighborhood: 'jardim',
      location: at('cras'),
      organizer: institution('vivaMelhor'),
      createdBy: 'sandra',
      attendees: 15,
      createdDaysAgo: 8,
      include: ['joao'],
    },
    {
      id: EVENT_IDS.oficina,
      title: 'Oficina de Educação Financeira',
      description:
        'Aprenda a organizar o orçamento da casa, evitar dívidas, usar o crédito com consciência e começar a poupar, mesmo com pouco dinheiro. A oficina é prática, com exemplos reais e material impresso. Vagas limitadas.',
      category: 'education',
      illustration: 'workshop',
      day: 12,
      from: 19,
      to: 21,
      venue: 'Biblioteca Comunitária',
      address: PUBLIC_SERVICES.biblioteca.address,
      neighborhood: 'centro',
      location: at('biblioteca'),
      organizer: institution('vivaMelhor'),
      createdBy: 'sandra',
      attendees: 14,
      createdDaysAgo: 2,
      capacity: 20,
    },
    {
      id: EVENT_IDS.sarau,
      title: 'Sarau Cultural da Vila',
      description:
        'Uma noite de música, poesia, dança e histórias do bairro no pátio da escola. Moradores de todas as idades podem se apresentar: basta chegar cedo e se inscrever na mesa de recepção. Haverá barraquinhas de comidas típicas com renda para as atividades da associação.',
      category: 'culture',
      illustration: 'culture',
      day: 16,
      from: 18,
      to: 22,
      venue: 'Escola Municipal Paulo Freire',
      address: PUBLIC_SERVICES.escola.address,
      neighborhood: 'vila',
      location: at('escola'),
      organizer: institution('associacao'),
      createdBy: 'jorge',
      attendees: 7,
      createdDaysAgo: 2,
    },
    {
      id: EVENT_IDS.torneio,
      title: 'Torneio de Futebol Comunitário',
      description:
        'Oito times formados por moradores de diferentes bairros disputaram o torneio de futebol society, com direito a churrasquinho e premiação simbólica. A renda das inscrições foi destinada à compra de uniformes para a escolinha do bairro.',
      category: 'sports',
      illustration: 'sports',
      day: -10,
      from: 14,
      to: 18,
      venue: 'Centro Esportivo Alto da Serra',
      address: PUBLIC_SERVICES.centroEsportivo.address,
      neighborhood: 'alto',
      location: at('centroEsportivo'),
      organizer: user('carlos'),
      createdBy: 'carlos',
      attendees: 16,
      createdDaysAgo: 25,
    },
    {
      id: EVENT_IDS.brecho,
      title: 'Feira de Trocas e Brechó Solidário',
      description:
        'Roupas, livros e utensílios foram trocados e doados em um grande brechó solidário no ateliê. Tudo que sobrou foi encaminhado para a campanha de agasalho da comunidade. Uma forma bonita de consumir menos e ajudar mais.',
      category: 'solidarity',
      illustration: 'donation',
      day: -21,
      from: 9,
      to: 15,
      venue: 'Ateliê Flor de Chita',
      address: BUSINESSES.atelie.address,
      neighborhood: 'jardim',
      location: around(ctx, BUSINESSES.atelie.offset),
      organizer: { kind: 'business', id: BUSINESSES.atelie.id, name: BUSINESSES.atelie.name },
      createdBy: 'heloisa',
      attendees: 11,
      createdDaysAgo: 35,
    },
  ]
}

export function buildEvents(ctx: SeedContext): CommunityEvent[] {
  return rows(ctx).map((row, index) => {
    const attendeeIds = pickPeople(row.attendees, index + 3, [])
    ;(row.include ?? []).forEach((key, slot) => {
      if (!attendeeIds.includes(uid(key))) attendeeIds[slot] = uid(key)
    })
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: EVENT_CATEGORIES[row.category].id,
      illustration: row.illustration,
      startsAt: ctx.at(row.day, row.from, 0),
      endsAt: ctx.at(row.day, row.to, 0),
      venue: row.venue,
      address: row.address,
      neighborhoodId: NEIGHBORHOODS[row.neighborhood].id,
      location: row.location,
      organizer: row.organizer,
      attendeeIds: [...new Set(attendeeIds)],
      ...(row.capacity !== undefined ? { capacity: row.capacity } : {}),
      accessibility: [...(EVENT_ACCESSIBILITY[row.id] ?? [])],
      status: 'scheduled' as const,
      createdBy: uid(row.createdBy),
      createdAt: ctx.at(-row.createdDaysAgo, 11, 0),
    }
  })
}
