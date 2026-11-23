import { formatProtocol } from '@/services/demands/status'
import type {
  Demand,
  DemandAISuggestion,
  DemandHistoryEntry,
  DemandStatus,
  GeoPoint,
  ID,
  ISODate,
  IllustrationKey,
  Urgency,
} from '@/types'

import {
  DEMAND_CATEGORIES,
  INSTITUTIONS,
  NEIGHBORHOODS,
  PEOPLE,
  type NeighborhoodKey,
  type PersonKey,
} from '../cast'
import type { SeedContext } from '../context'
import { near, pickPeople, plusHours, uid } from './shared'

type CategoryKey = keyof typeof DEMAND_CATEGORIES

/** Ids fixos das demandas (numeração da especificação), usados por posts e notificações. */
export const DEMAND_IDS = {
  buraco: 'dem_01',
  lixo: 'dem_02',
  poste: 'dem_03',
  ponto: 'dem_04',
  rampa: 'dem_05',
  vazamento: 'dem_06',
  muro: 'dem_07',
  bueiro: 'dem_08',
  semaforo: 'dem_09',
  pracaLuz: 'dem_10',
  onibus: 'dem_11',
  barulho: 'dem_12',
} as const

interface Step {
  /** Horas após o registro (ignorado se `at` for informado). */
  afterHours?: number
  at?: ISODate
  status: DemandStatus
  message: string
}

interface Row {
  id: ID
  title: string
  description: string
  category: CategoryKey
  neighborhood: NeighborhoodKey
  author: PersonKey
  status: DemandStatus
  supporters: number
  urgency: Urgency
  createdAt: ISODate
  location: GeoPoint
  addressHint: string
  illustration: IllustrationKey
  steps: Step[]
  ai?: Omit<DemandAISuggestion, 'mode' | 'generatedAt'>
}

const ILLUSTRATION: Record<CategoryKey, IllustrationKey> = {
  pothole: 'pothole',
  trash: 'trash',
  lighting: 'dark-street',
  transport: 'bus',
  accessibility: 'accessibility',
  sanitation: 'sanitation',
  infrastructure: 'infrastructure',
  other: 'generic-demand',
}

function rows(ctx: SeedContext): Row[] {
  return [
    {
      id: DEMAND_IDS.buraco,
      title: 'Buraco grande na Rua das Acácias',
      description:
        'Há mais de um mês existe um buraco fundo no meio da Rua das Acácias, quase em frente à padaria. Carros desviam para a contramão e motos já quase caíram. Com a chuva ele está aumentando. Peço uma vistoria e o conserto do asfalto.',
      category: 'pothole',
      neighborhood: 'vila',
      author: 'antonio',
      status: 'in_progress',
      supporters: 11,
      urgency: 'high',
      createdAt: ctx.at(-9, 8, 40),
      location: near(ctx, 'vila', 240, 300),
      addressHint: 'Rua das Acácias, altura do nº 150, perto da padaria',
      illustration: ILLUSTRATION.pothole,
      steps: [
        {
          afterHours: 20,
          status: 'in_review',
          message: 'Demanda recebida pela equipe de zeladoria e encaminhada para vistoria técnica.',
        },
        {
          afterHours: 144,
          status: 'in_progress',
          message:
            'Vistoria realizada. O reparo do pavimento foi programado e a equipe já está no local.',
        },
      ],
      ai: {
        categoryId: DEMAND_CATEGORIES.pothole.id,
        categoryConfidence: 0.94,
        summary:
          'Buraco profundo em via de grande circulação, com risco para motoristas e motociclistas.',
        urgency: 'high',
        urgencyReasons: [
          'Risco de acidente com veículos',
          'Via de grande circulação',
          'O problema piora com a chuva',
        ],
        institutionIds: [INSTITUTIONS.prefeitura.id],
      },
    },
    {
      id: DEMAND_IDS.lixo,
      title: 'Lixo acumulado na esquina da praça',
      description:
        'Sacos de lixo e entulho estão sendo deixados na esquina da praça do Jardim das Flores e a coleta não leva tudo. Já aparecem ratos e o mau cheiro incomoda quem passa. Precisamos de limpeza e de uma solução para o descarte irregular.',
      category: 'trash',
      neighborhood: 'jardim',
      author: 'ana',
      status: 'in_review',
      supporters: 7,
      urgency: 'medium',
      createdAt: ctx.at(-4, 17, 10),
      location: near(ctx, 'jardim', 80, -110),
      addressHint: 'Esquina da Rua das Margaridas com a praça',
      illustration: ILLUSTRATION.trash,
      steps: [
        {
          afterHours: 26,
          status: 'in_review',
          message:
            'Demanda recebida. A equipe de limpeza urbana vai avaliar o local e reforçar a coleta.',
        },
      ],
    },
    {
      id: DEMAND_IDS.poste,
      title: 'Poste apagado em frente à escola',
      description:
        'O poste em frente à Escola Municipal Paulo Freire está apagado há alguns dias. Na saída da noite, a rua fica completamente escura e as famílias ficam inseguras. Peço a troca da lâmpada.',
      category: 'lighting',
      neighborhood: 'vila',
      author: 'maria',
      status: 'registered',
      supporters: 5,
      urgency: 'medium',
      createdAt: ctx.at(-1, 19, 20),
      location: near(ctx, 'vila', -140, 180),
      addressHint: 'Rua dos Estudantes, em frente à Escola Municipal Paulo Freire',
      illustration: ILLUSTRATION.lighting,
      steps: [],
    },
    {
      id: DEMAND_IDS.ponto,
      title: 'Ponto de ônibus sem cobertura',
      description:
        'O ponto de ônibus da Avenida Principal não tem cobertura nem banco. Idosos e crianças esperam no sol forte ou na chuva. Solicito a instalação de um abrigo.',
      category: 'transport',
      neighborhood: 'centro',
      author: 'joao',
      status: 'resolved',
      supporters: 9,
      urgency: 'medium',
      createdAt: ctx.at(-30, 9, 5),
      location: near(ctx, 'centro', -60, -210),
      addressHint: 'Avenida Principal, próximo ao nº 600',
      illustration: ILLUSTRATION.transport,
      steps: [
        {
          afterHours: 48,
          status: 'in_review',
          message:
            'Demanda recebida pela secretaria de mobilidade e incluída no planejamento de pontos.',
        },
        {
          afterHours: 216,
          status: 'in_progress',
          message: 'Obra do abrigo autorizada. A instalação começa nos próximos dias.',
        },
        {
          at: ctx.at(-5, 15, 0),
          status: 'resolved',
          message: 'Abrigo instalado, com cobertura e banco. Obrigado por colaborar com o bairro!',
        },
      ],
    },
    {
      id: DEMAND_IDS.rampa,
      title: 'Calçada sem rampa de acesso na Avenida Principal',
      description:
        'Na faixa de pedestres da Avenida Principal não há rampa na calçada. Cadeirantes e pessoas com carrinho de bebê precisam descer pela rua, entre os carros. Peço a construção de uma rampa de acesso com piso tátil.',
      category: 'accessibility',
      neighborhood: 'centro',
      author: 'camila',
      status: 'in_review',
      supporters: 6,
      urgency: 'medium',
      createdAt: ctx.at(-6, 14, 30),
      location: near(ctx, 'centro', 110, 150),
      addressHint: 'Avenida Principal, altura do nº 520',
      illustration: ILLUSTRATION.accessibility,
      steps: [
        {
          afterHours: 30,
          status: 'in_review',
          message:
            'Demanda recebida e encaminhada à equipe de acessibilidade para avaliação do local.',
        },
      ],
    },
    {
      id: DEMAND_IDS.vazamento,
      title: 'Vazamento de água na Rua do Mirante',
      description:
        'Há um vazamento constante de água limpa na Rua do Mirante, que já forma uma poça enorme e começa a danificar o asfalto. A água corre há mais de uma semana. Peço o reparo da tubulação.',
      category: 'sanitation',
      neighborhood: 'alto',
      author: 'carlos',
      status: 'in_progress',
      supporters: 8,
      urgency: 'high',
      createdAt: ctx.at(-7, 7, 50),
      location: near(ctx, 'alto', -60, -90),
      addressHint: 'Rua do Mirante, em frente ao nº 140',
      illustration: ILLUSTRATION.sanitation,
      steps: [
        {
          afterHours: 8,
          status: 'in_review',
          message: 'Demanda recebida. Equipe de saneamento foi avisada do vazamento.',
        },
        {
          afterHours: 52,
          status: 'in_progress',
          message: 'Equipe no local. O reparo da tubulação está em andamento.',
        },
      ],
      ai: {
        categoryId: DEMAND_CATEGORIES.sanitation.id,
        categoryConfidence: 0.91,
        summary:
          'Vazamento contínuo de água tratada na via, com desperdício e risco de dano ao pavimento.',
        urgency: 'high',
        urgencyReasons: [
          'Desperdício de água',
          'Risco de dano ao asfalto',
          'Ocorrência há mais de uma semana',
        ],
        institutionIds: [INSTITUTIONS.prefeitura.id],
      },
    },
    {
      id: DEMAND_IDS.muro,
      title: 'Muro com risco de queda no terreno baldio',
      description:
        'O muro do terreno baldio ao lado da Avenida das Nascentes está inclinado e com rachaduras grandes. Crianças passam e brincam ali todos os dias. Peço uma vistoria urgente da Defesa Civil.',
      category: 'infrastructure',
      neighborhood: 'parque',
      author: 'pedro',
      status: 'registered',
      supporters: 4,
      urgency: 'high',
      createdAt: ctx.at(-2, 16, 15),
      location: near(ctx, 'parque', 70, 120),
      addressHint: 'Avenida das Nascentes, terreno ao lado do nº 210',
      illustration: ILLUSTRATION.infrastructure,
      steps: [],
      ai: {
        categoryId: DEMAND_CATEGORIES.infrastructure.id,
        categoryConfidence: 0.88,
        summary:
          'Muro inclinado e rachado em calçada de passagem de crianças, com risco de desabamento.',
        urgency: 'high',
        urgencyReasons: [
          'Risco de queda sobre pedestres',
          'Presença frequente de crianças',
          'Estrutura com rachaduras visíveis',
        ],
        institutionIds: [INSTITUTIONS.prefeitura.id],
      },
    },
    {
      id: DEMAND_IDS.bueiro,
      title: 'Bueiro entupido na Rua do Ipê Amarelo',
      description:
        'O bueiro da esquina da Rua do Ipê Amarelo está entupido de folhas e lixo. Com qualquer chuva a água empoça e invade a calçada. Peço a limpeza antes das chuvas fortes.',
      category: 'sanitation',
      neighborhood: 'vila',
      author: 'antonio',
      status: 'registered',
      supporters: 2,
      urgency: 'medium',
      createdAt: ctx.ago(180),
      location: near(ctx, 'vila', 250, -250),
      addressHint: 'Rua do Ipê Amarelo, em frente ao nº 40',
      illustration: ILLUSTRATION.sanitation,
      steps: [],
    },
    {
      id: DEMAND_IDS.semaforo,
      title: 'Semáforo de pedestres com defeito',
      description:
        'O semáforo de pedestres do cruzamento da Avenida Principal com a Praça da Matriz está sem o sinal sonoro e a luz verde some depois de poucos segundos. Os idosos não conseguem atravessar a tempo.',
      category: 'infrastructure',
      neighborhood: 'centro',
      author: 'juliana',
      status: 'in_progress',
      supporters: 10,
      urgency: 'medium',
      createdAt: ctx.at(-12, 10, 5),
      location: near(ctx, 'centro', -30, 40),
      addressHint: 'Cruzamento da Avenida Principal com a Praça da Matriz',
      illustration: ILLUSTRATION.infrastructure,
      steps: [
        {
          afterHours: 24,
          status: 'in_review',
          message: 'Demanda recebida pela equipe de trânsito e semaforização.',
        },
        {
          afterHours: 120,
          status: 'in_progress',
          message:
            'Técnicos agendados para reprogramar o tempo de travessia e reparar o aviso sonoro.',
        },
      ],
    },
    {
      id: DEMAND_IDS.pracaLuz,
      title: 'Iluminação fraca na praça do Jardim das Flores',
      description:
        'Os postes da praça do Jardim das Flores têm lâmpadas fracas ou queimadas. À noite a praça fica muito escura e as pessoas deixaram de usá-la. Peço a troca por lâmpadas de LED.',
      category: 'lighting',
      neighborhood: 'jardim',
      author: 'fernanda',
      status: 'resolved',
      supporters: 12,
      urgency: 'medium',
      createdAt: ctx.at(-45, 20, 10),
      location: near(ctx, 'jardim', 40, -60),
      addressHint: 'Praça do Jardim das Flores',
      illustration: ILLUSTRATION.lighting,
      steps: [
        {
          afterHours: 72,
          status: 'in_review',
          message: 'Demanda recebida e incluída no plano de modernização da iluminação.',
        },
        {
          afterHours: 480,
          status: 'in_progress',
          message: 'Troca das lâmpadas por LED iniciada na praça.',
        },
        {
          at: ctx.at(-12, 16, 0),
          status: 'resolved',
          message: 'Nova iluminação em LED instalada em toda a praça. A demanda foi concluída.',
        },
      ],
    },
    {
      id: DEMAND_IDS.onibus,
      title: 'Linha de ônibus com atrasos frequentes',
      description:
        'A linha que atende o Parque das Águas atrasa quase todos os dias, de 20 a 40 minutos, e às vezes nem passa. Quem depende do ônibus para o trabalho chega atrasado. Peço a revisão da frota e do horário da linha.',
      category: 'transport',
      neighborhood: 'parque',
      author: 'beatriz',
      status: 'in_review',
      supporters: 9,
      urgency: 'medium',
      createdAt: ctx.at(-8, 18, 40),
      location: near(ctx, 'parque', -40, 160),
      addressHint: 'Ponto da Avenida das Nascentes, próximo ao nº 300',
      illustration: ILLUSTRATION.transport,
      steps: [
        {
          afterHours: 48,
          status: 'in_review',
          message:
            'Demanda recebida e enviada à gestão do transporte coletivo para análise dos horários.',
        },
      ],
    },
    {
      id: DEMAND_IDS.barulho,
      title: 'Barulho de obra fora do horário permitido',
      description:
        'Uma obra na Rua das Acácias está fazendo barulho muito alto depois das 22h e aos domingos de manhã. Já conversei com o responsável, mas o problema continua. Gostaria que a associação intermediasse.',
      category: 'other',
      neighborhood: 'vila',
      author: 'rafael',
      status: 'closed',
      supporters: 3,
      urgency: 'low',
      createdAt: ctx.at(-20, 22, 30),
      location: near(ctx, 'vila', 220, 310),
      addressHint: 'Rua das Acácias, obra no nº 300',
      illustration: ILLUSTRATION.other,
      steps: [],
    },
  ]
}

const PREFEITURA = INSTITUTIONS.prefeitura.name

export function buildDemands(ctx: SeedContext): Demand[] {
  const year = ctx.now.getFullYear()
  const ordered = rows(ctx)
    .map((row, index) => ({ row, index }))
    // Os protocolos seguem a ordem em que as demandas foram registradas.
    .sort((a, b) => a.row.createdAt.localeCompare(b.row.createdAt))

  return ordered.map(({ row, index }, position) => {
    const institution = INSTITUTIONS[DEMAND_CATEGORIES[row.category].defaultInstitution]
    const authorId = uid(row.author)
    const authorName = PEOPLE[row.author].name

    const history: DemandHistoryEntry[] = [
      {
        id: `${row.id}_h1`,
        createdAt: row.createdAt,
        actorId: authorId,
        actorKind: 'citizen',
        actorName: authorName,
        message: 'Demanda registrada.',
        simulated: false,
      },
      {
        id: `${row.id}_h2`,
        createdAt: plusHours(ctx, row.createdAt, 0.05),
        actorKind: 'system',
        actorName: 'NEXA',
        message: `Encaminhamento sugerido: ${institution.name}.`,
        simulated: true,
      },
    ]

    row.steps.forEach((step, stepIndex) => {
      history.push({
        id: `${row.id}_h${stepIndex + 3}`,
        createdAt: step.at ?? plusHours(ctx, row.createdAt, step.afterHours ?? 0),
        actorKind: 'institution',
        actorName: PREFEITURA,
        status: step.status,
        message: step.message,
        simulated: true,
      })
    })

    if (row.status === 'closed') {
      history.push({
        id: `${row.id}_h3`,
        createdAt: plusHours(ctx, row.createdAt, 96),
        actorId: authorId,
        actorKind: 'citizen',
        actorName: authorName,
        status: 'closed',
        message:
          'Encerrada pelo autor: a obra passou a respeitar o horário depois da conversa com a associação.',
        simulated: false,
      })
    }

    const lastEntry = history[history.length - 1]
    const demand: Demand = {
      id: row.id,
      protocol: formatProtocol(year, position + 1),
      authorId,
      categoryId: DEMAND_CATEGORIES[row.category].id,
      title: row.title,
      description: row.description,
      photos: [],
      illustration: row.illustration,
      location: row.location,
      addressHint: row.addressHint,
      neighborhoodId: NEIGHBORHOODS[row.neighborhood].id,
      urgency: row.urgency,
      ...(row.ai
        ? {
            aiSuggestion: {
              ...row.ai,
              mode: 'demo' as const,
              generatedAt: plusHours(ctx, row.createdAt, 0.02),
            },
          }
        : {}),
      status: row.status,
      institutionId: institution.id,
      supporterIds: pickPeople(row.supporters, index + 1, [row.author]),
      history,
      createdAt: row.createdAt,
      updatedAt: lastEntry?.createdAt ?? row.createdAt,
    }
    return demand
  })
}
