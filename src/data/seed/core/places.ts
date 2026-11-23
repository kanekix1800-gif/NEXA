import type {
  Business,
  Category,
  DayHours,
  Institution,
  Neighborhood,
  PublicService,
  WeekSchedule,
} from '@/types'

import {
  BUSINESSES,
  BUSINESS_CATEGORIES,
  DEMAND_CATEGORIES,
  EVENT_CATEGORIES,
  INSTITUTIONS,
  MERCHANTS,
  NEIGHBORHOODS,
  PUBLIC_SERVICES,
  type BusinessKey,
  type CastCategory,
  type InstitutionKey,
} from '../cast'
import type { SeedContext } from '../context'
import { BUSINESS_ACCESSIBILITY, SERVICE_ACCESSIBILITY } from './mobility'

/**
 * Telefone fictício: DDD "00" (inexistente) + 9 + dígitos sequenciais.
 * Nunca coincide com um número real. Ex.: `phone(12)` → "00900000012".
 */
type PublicServiceKey = keyof typeof PUBLIC_SERVICES

export function phone(n: number): string {
  return `0090000${String(n).padStart(4, '0')}`
}

export function buildNeighborhoods(ctx: SeedContext): Neighborhood[] {
  return Object.values(NEIGHBORHOODS).map((nb) => ({
    id: nb.id,
    name: nb.name,
    center: ctx.point(nb.offset),
    zone: nb.zone,
  }))
}

export function buildCategories(): Category[] {
  const categories: Category[] = []
  const add = (group: Record<string, CastCategory>): void => {
    Object.values(group).forEach((cat, index) => {
      const institution = cat.defaultInstitution ? INSTITUTIONS[cat.defaultInstitution] : undefined
      categories.push({
        id: cat.id,
        kind: cat.kind,
        name: cat.name,
        ...(cat.description ? { description: cat.description } : {}),
        icon: cat.icon,
        color: cat.color,
        active: true,
        system: true,
        order: index + 1,
        ...(institution ? { defaultInstitutionId: institution.id } : {}),
      })
    })
  }
  add(DEMAND_CATEGORIES)
  add(BUSINESS_CATEGORIES)
  add(EVENT_CATEGORIES)
  return categories
}

interface InstitutionContent {
  description: string
  areas: string[]
  services: string[]
  address: string
  email: string
  phoneNumber: number
  createdDaysAgo: number
}

const INSTITUTION_CONTENT: Record<InstitutionKey, InstitutionContent> = {
  prefeitura: {
    description:
      'Órgão municipal fictício que reúne os serviços públicos da cidade demonstrativa: zeladoria urbana, saúde, educação, mobilidade e assistência social. No NEXA, recebe as demandas dos moradores e informa o andamento de cada uma. Todas as atualizações exibidas aqui são simuladas.',
    areas: ['Zeladoria urbana', 'Saúde', 'Educação', 'Mobilidade', 'Assistência social'],
    services: [
      'Reparo de vias e calçadas',
      'Coleta de lixo e limpeza urbana',
      'Manutenção da iluminação pública',
      'Atendimento ao cidadão',
      'Campanhas de saúde e vacinação',
    ],
    address: 'Praça da Matriz, 1 — Centro',
    email: 'atendimento.prefeitura@nexa.demo',
    phoneNumber: 1,
    createdDaysAgo: 178,
  },
  vivaMelhor: {
    description:
      'Organização da sociedade civil fictícia que atua com segurança alimentar, reforço escolar e geração de renda. Mantém a Cozinha Solidária e conta com voluntários do Jardim das Flores e de bairros vizinhos.',
    areas: ['Segurança alimentar', 'Educação', 'Geração de renda', 'Voluntariado'],
    services: [
      'Cozinha Solidária',
      'Reforço escolar comunitário',
      'Campanhas de arrecadação de alimentos',
      'Oficinas de educação financeira',
    ],
    address: 'Rua das Margaridas, 120 — Jardim das Flores',
    email: 'contato.vivamelhor@nexa.demo',
    phoneNumber: 2,
    createdDaysAgo: 146,
  },
  sebrae: {
    description:
      'Exemplo demonstrativo: o NEXA não possui parceria oficial com a instituição citada. Este cartão ilustra como uma entidade de apoio ao empreendedor pode aparecer no diretório, com orientação para pequenos negócios, capacitações e eventos de empreendedorismo.',
    areas: ['Empreendedorismo', 'Capacitação', 'Gestão de pequenos negócios'],
    services: [
      'Orientação para pequenos negócios',
      'Cursos e oficinas de gestão',
      'Feiras e rodadas de empreendedorismo',
    ],
    address: 'Rua do Comércio, 75 — Centro',
    email: 'exemplo.apoio@nexa.demo',
    phoneNumber: 3,
    createdDaysAgo: 170,
  },
  associacao: {
    description:
      'Associação de moradores fictícia da Vila Esperança. Reúne vizinhos para cuidar do bairro: organiza mutirões, a horta comunitária, o sarau cultural e leva as reivindicações da comunidade ao poder público.',
    areas: ['Mobilização comunitária', 'Cultura', 'Meio ambiente', 'Defesa de direitos'],
    services: [
      'Mutirões de limpeza e plantio',
      'Horta Comunitária da Vila',
      'Encaminhamento de demandas coletivas',
      'Sarau e eventos culturais',
    ],
    address: 'Rua dos Estudantes, 12 — Vila Esperança',
    email: 'contato.associacao@nexa.demo',
    phoneNumber: 4,
    createdDaysAgo: 135,
  },
}

export function buildInstitutions(ctx: SeedContext): Institution[] {
  return (
    Object.entries(INSTITUTIONS) as Array<[InstitutionKey, (typeof INSTITUTIONS)[InstitutionKey]]>
  ).map(([key, ins]) => {
    const content = INSTITUTION_CONTENT[key]
    return {
      id: ins.id,
      name: ins.name,
      category: ins.category,
      tagline: ins.tagline,
      description: content.description,
      areas: content.areas,
      services: content.services,
      phone: phone(content.phoneNumber),
      email: content.email,
      address: content.address,
      neighborhoodId: NEIGHBORHOODS[ins.neighborhood].id,
      location: ctx.point(ins.offset),
      icon: ins.icon,
      color: ins.color,
      verified: true,
      isDemo: true,
      createdAt: ctx.at(-content.createdDaysAgo, 9),
    }
  })
}

const SERVICE_CONTENT: Record<
  PublicServiceKey,
  { description: string; hours: string; phoneNumber: number }
> = {
  ubs: {
    description:
      'Unidade básica de saúde com atendimento clínico, vacinação, curativos, acompanhamento de gestantes e distribuição de medicamentos básicos.',
    hours: 'Seg a sex, 7h às 17h',
    phoneNumber: 11,
  },
  escola: {
    description:
      'Escola municipal de ensino fundamental. Aos sábados, o espaço é cedido para atividades culturais e reuniões comunitárias.',
    hours: 'Seg a sex, 7h às 17h30',
    phoneNumber: 12,
  },
  cras: {
    description:
      'Centro de Referência de Assistência Social: orientação a famílias, cadastro em programas sociais e ações de convivência.',
    hours: 'Seg a sex, 8h às 17h',
    phoneNumber: 13,
  },
  biblioteca: {
    description:
      'Biblioteca mantida pela comunidade, com acervo para todas as idades, sala de estudos, internet gratuita e oficinas.',
    hours: 'Ter a sáb, 9h às 18h',
    phoneNumber: 14,
  },
  ecoponto: {
    description:
      'Ponto de entrega voluntária de entulho, móveis velhos, podas e materiais recicláveis. Evite o descarte irregular.',
    hours: 'Seg a sáb, 7h às 17h',
    phoneNumber: 15,
  },
  centroEsportivo: {
    description:
      'Quadra poliesportiva, campo de futebol society e sala de ginástica, com aulas e torneios para a comunidade.',
    hours: 'Todos os dias, 6h às 21h',
    phoneNumber: 16,
  },
  terminal: {
    description:
      'Terminal central de integração do transporte coletivo, com bilheteria, painel de horários e atendimento ao passageiro.',
    hours: 'Todos os dias, 5h às 23h',
    phoneNumber: 17,
  },
  pracaCidadania: {
    description:
      'Posto que concentra serviços como emissão de documentos, protocolo de solicitações e orientação ao cidadão.',
    hours: 'Seg a sex, 8h às 16h',
    phoneNumber: 18,
  },
}

export function buildPublicServices(ctx: SeedContext): PublicService[] {
  return (
    Object.entries(PUBLIC_SERVICES) as Array<
      [PublicServiceKey, (typeof PUBLIC_SERVICES)[PublicServiceKey]]
    >
  ).map(([key, svc]) => {
    const content = SERVICE_CONTENT[key]
    const institution = svc.institution ? INSTITUTIONS[svc.institution] : undefined
    return {
      id: svc.id,
      name: svc.name,
      kind: svc.kind,
      description: content.description,
      address: svc.address,
      neighborhoodId: NEIGHBORHOODS[svc.neighborhood].id,
      location: ctx.point(svc.offset),
      hours: content.hours,
      phone: phone(content.phoneNumber),
      ...(institution ? { institutionId: institution.id } : {}),
      accessibility: [...SERVICE_ACCESSIBILITY[key]],
      icon: svc.icon,
      color: svc.color,
    }
  })
}

// ── Estabelecimentos ─────────────────────────────────────────────────────────

const day = (open: string, close: string): DayHours => ({ open, close })

/** Monta a semana (0 = domingo) a partir de uma função por dia. */
function week(hoursFor: (weekday: number) => DayHours | null): WeekSchedule {
  return [hoursFor(0), hoursFor(1), hoursFor(2), hoursFor(3), hoursFor(4), hoursFor(5), hoursFor(6)]
}

/** Horário de funcionamento da Padaria (também usado para gerar as vendas). */
export const PADARIA_SCHEDULE: WeekSchedule = week((d) =>
  d === 0 ? day('06:00', '13:00') : day('06:00', '20:00'),
)

interface BusinessContent {
  description: string
  schedule: WeekSchedule
  tags: string[]
  phoneNumber: number
  instagram: string
  email: string
  createdDaysAgo: number
}

const BUSINESS_CONTENT: Record<BusinessKey, BusinessContent> = {
  padaria: {
    description:
      'Pão quentinho saindo do forno toda hora, café coado na hora e bolos caseiros. Uma padaria de bairro onde todo mundo se conhece pelo nome. Encomendas de tortas e salgados para festas.',
    schedule: PADARIA_SCHEDULE,
    tags: ['Pão fresquinho', 'Aceita Pix', 'Encomendas', 'Café da manhã'],
    phoneNumber: 21,
    instagram: 'padariadobairro.demo',
    email: 'contato.padaria@nexa.demo',
    createdDaysAgo: 172,
  },
  farmacia: {
    description:
      'Medicamentos, higiene e cuidados com a saúde, com atendimento de farmacêutico responsável. Medição de pressão e entrega gratuita no Centro e bairros próximos.',
    schedule: week(() => day('07:00', '22:00')),
    tags: ['Entrega', 'Aceita Pix', 'Aberta todos os dias', 'Aferição de pressão'],
    phoneNumber: 22,
    instagram: 'farmaciapopular.demo',
    email: 'contato.farmacia@nexa.demo',
    createdDaysAgo: 156,
  },
  mercadinho: {
    description:
      'Mercadinho de vizinhança com hortifrúti fresco, mercearia e produtos de limpeza. Preço justo, atendimento próximo e fiado para a vizinhança de confiança da dona Lúcia.',
    schedule: week(() => day('07:00', '21:00')),
    tags: ['Hortifrúti', 'Aceita Pix', 'Entrega no bairro', 'Preço justo'],
    phoneNumber: 23,
    instagram: 'mercadinhodavila.demo',
    email: 'contato.mercadinho@nexa.demo',
    createdDaysAgo: 138,
  },
  restaurante: {
    description:
      'Comida caseira feita no fogão a lenha: prato feito, feijoada aos sábados e sobremesas da vovó. Almoço servido das 11h às 15h, de terça a domingo.',
    schedule: week((d) => (d === 1 ? null : day('11:00', '15:00'))),
    tags: ['Comida caseira', 'Marmita', 'Aceita Pix', 'Espaço para família'],
    phoneNumber: 24,
    instagram: 'sabordecasa.demo',
    email: 'contato.sabordecasa@nexa.demo',
    createdDaysAgo: 124,
  },
  salao: {
    description:
      'Cortes, coloração, escova, manicure e tratamentos capilares em ambiente aconchegante. Atendimento com hora marcada de terça a sábado.',
    schedule: week((d) => (d >= 2 && d <= 6 ? day('09:00', '19:00') : null)),
    tags: ['Hora marcada', 'Manicure', 'Aceita cartão', 'Ambiente climatizado'],
    phoneNumber: 25,
    instagram: 'studiobela.demo',
    email: 'contato.studiobela@nexa.demo',
    createdDaysAgo: 107,
  },
  tecnofix: {
    description:
      'Conserto de celulares, notebooks e computadores, com orçamento sem compromisso. Troca de tela e bateria no mesmo dia e garantia de 90 dias no serviço.',
    schedule: week((d) =>
      d >= 1 && d <= 5 ? day('09:00', '18:00') : d === 6 ? day('09:00', '13:00') : null,
    ),
    tags: ['Garantia de 90 dias', 'Orçamento grátis', 'Troca de tela', 'Aceita Pix'],
    phoneNumber: 26,
    instagram: 'tecnofix.demo',
    email: 'contato.tecnofix@nexa.demo',
    createdDaysAgo: 93,
  },
  atelie: {
    description:
      'Roupas e acessórios artesanais em chita e tecidos naturais, feitos à mão. Peças sob medida, consertos e oficinas de costura criativa.',
    schedule: week((d) => (d >= 1 && d <= 6 ? day('10:00', '18:00') : null)),
    tags: ['Feito à mão', 'Sob medida', 'Consertos', 'Oficinas'],
    phoneNumber: 27,
    instagram: 'atelieflordechita.demo',
    email: 'contato.atelie@nexa.demo',
    createdDaysAgo: 77,
  },
  pet: {
    description:
      'Banho, tosa e acessórios para cães e gatos, com carinho e paciência. Buscamos e levamos seu pet em casa no Alto da Serra.',
    schedule: week((d) => (d >= 1 && d <= 6 ? day('08:00', '18:00') : null)),
    tags: ['Leva e traz', 'Banho e tosa', 'Aceita cartão', 'Atende gatos'],
    phoneNumber: 28,
    instagram: 'petamigo.demo',
    email: 'contato.petamigo@nexa.demo',
    createdDaysAgo: 53,
  },
}

export function buildBusinesses(ctx: SeedContext): Business[] {
  return (Object.entries(BUSINESSES) as Array<[BusinessKey, (typeof BUSINESSES)[BusinessKey]]>).map(
    ([key, biz]) => {
      const content = BUSINESS_CONTENT[key]
      const number = phone(content.phoneNumber)
      return {
        id: biz.id,
        ownerId: MERCHANTS[biz.owner].id,
        name: biz.name,
        categoryId: BUSINESS_CATEGORIES[biz.category].id,
        description: content.description,
        illustration: biz.illustration,
        gallery: [],
        address: biz.address,
        neighborhoodId: NEIGHBORHOODS[biz.neighborhood].id,
        location: ctx.point(biz.offset),
        phone: number,
        whatsapp: number,
        email: content.email,
        instagram: content.instagram,
        schedule: content.schedule,
        tags: content.tags,
        accessibility: [...BUSINESS_ACCESSIBILITY[key]],
        settings: { allowNegativeStock: false },
        isDemo: true,
        status: 'active',
        createdAt: ctx.at(-content.createdDaysAgo, 11),
        updatedAt: ctx.at(-Math.max(2, Math.floor(content.createdDaysAgo / 4)), 16),
      }
    },
  )
}
