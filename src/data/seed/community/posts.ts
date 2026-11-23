import type {
  Comment,
  ContentReport,
  ID,
  ISODate,
  IllustrationKey,
  Post,
  PostCategory,
} from '@/types'

import { BUSINESSES, INSTITUTIONS, type PersonKey, PEOPLE } from '../cast'
import type { SeedContext } from '../context'
import { DEMAND_IDS } from './demands'
import { EVENT_IDS } from './events'
import { homeOf, pickLikers, plusMinutes, uid } from './shared'

export type PostKey =
  | 'saudeSabado'
  | 'campanha'
  | 'mutirao'
  | 'dem1'
  | 'dem2'
  | 'dem3'
  | 'dem6'
  | 'feira'
  | 'mutiraoSaude'
  | 'oficina'
  | 'eletricista'
  | 'cachorro'
  | 'rifa'
  | 'padaria'
  | 'atelie'

interface PostRow {
  key: PostKey
  author: PersonKey
  category: PostCategory
  content: string
  createdAt: ISODate
  likes: number
  institution?: keyof typeof INSTITUTIONS
  business?: keyof typeof BUSINESSES
  illustration?: IllustrationKey
  demand?: ID
  event?: ID
}

function postRows(ctx: SeedContext): PostRow[] {
  return [
    {
      key: 'saudeSabado',
      author: 'maria',
      category: 'discussion',
      content: 'Alguém sabe se o posto de saúde do bairro vai abrir no sábado?',
      createdAt: ctx.ago(65),
      likes: 4,
    },
    {
      key: 'campanha',
      author: 'joao',
      category: 'social',
      content: 'Vamos juntos na ação de arrecadação de alimentos!',
      createdAt: ctx.ago(185),
      likes: 9,
      illustration: 'donation',
      event: EVENT_IDS.campanha,
    },
    {
      key: 'mutirao',
      author: 'ana',
      category: 'social',
      content: 'Estamos organizando um mutirão para revitalizar a praça do bairro.',
      createdAt: ctx.at(-3, 18, 30),
      likes: 12,
      illustration: 'square',
      event: EVENT_IDS.mutirao,
    },
    {
      key: 'dem1',
      author: 'antonio',
      category: 'demand',
      content: 'Registrei uma demanda: Buraco grande na Rua das Acácias',
      createdAt: ctx.at(-9, 8, 45),
      likes: 10,
      demand: DEMAND_IDS.buraco,
    },
    {
      key: 'dem2',
      author: 'ana',
      category: 'demand',
      content: 'Registrei uma demanda: Lixo acumulado na esquina da praça',
      createdAt: ctx.at(-4, 17, 15),
      likes: 6,
      demand: DEMAND_IDS.lixo,
    },
    {
      key: 'dem3',
      author: 'maria',
      category: 'demand',
      content: 'Registrei uma demanda: Poste apagado em frente à escola',
      createdAt: ctx.at(-1, 19, 25),
      likes: 5,
      demand: DEMAND_IDS.poste,
    },
    {
      key: 'dem6',
      author: 'carlos',
      category: 'demand',
      content: 'Registrei uma demanda: Vazamento de água na Rua do Mirante',
      createdAt: ctx.at(-7, 7, 55),
      likes: 7,
      demand: DEMAND_IDS.vazamento,
    },
    {
      key: 'feira',
      author: 'jorge',
      category: 'event',
      content:
        'Está chegando a Feira de Empreendedorismo! Estandes de pequenos negócios, palestras e orientação para quem quer começar. Entrada gratuita, na Praça da Matriz.',
      createdAt: ctx.at(-5, 10, 0),
      likes: 8,
      institution: 'associacao',
      illustration: 'fair',
      event: EVENT_IDS.feira,
    },
    {
      key: 'mutiraoSaude',
      author: 'roberto',
      category: 'event',
      content:
        'Mutirão de Saúde na UBS Central: aferição de pressão, glicemia, vacinação e orientação odontológica. Traga documento com foto e cartão de vacinação.',
      createdAt: ctx.at(-4, 9, 0),
      likes: 11,
      institution: 'prefeitura',
      illustration: 'health',
      event: EVENT_IDS.saude,
    },
    {
      key: 'oficina',
      author: 'sandra',
      category: 'event',
      content:
        'Inscrições abertas para a Oficina de Educação Financeira, na Biblioteca Comunitária. São 20 vagas e a participação é gratuita. Confirme sua presença!',
      createdAt: ctx.at(-2, 11, 0),
      likes: 6,
      institution: 'vivaMelhor',
      illustration: 'workshop',
      event: EVENT_IDS.oficina,
    },
    {
      key: 'eletricista',
      author: 'pedro',
      category: 'discussion',
      content:
        'Pessoal, alguém indica um eletricista de confiança aqui pela região? Preciso trocar a fiação da cozinha e queria um profissional honesto.',
      createdAt: ctx.at(-6, 20, 15),
      likes: 3,
    },
    {
      key: 'cachorro',
      author: 'fernanda',
      category: 'discussion',
      content:
        'Encontrei um cachorrinho caramelo, de porte médio, muito dócil, perto da praça do Jardim das Flores. Está sem coleira. Se for seu ou se reconhecer o dono, me chame aqui!',
      createdAt: ctx.at(-1, 8, 30),
      likes: 9,
    },
    {
      key: 'rifa',
      author: 'luiz',
      category: 'discussion',
      content:
        'URGENTE!!! RIFA BENEFICENTE: concorra a uma moto 0 km por apenas R$ 5! Faça o Pix agora e mande o comprovante no privado para garantir seu número. Só até hoje! Compartilhe com 10 grupos para ter chance dobrada.',
      createdAt: ctx.at(-2, 23, 10),
      likes: 2,
    },
    {
      key: 'padaria',
      author: 'carla',
      category: 'commerce',
      content:
        'Promoção de fim de semana na Padaria do Bairro: na compra de 10 pães franceses, leve um café coado grátis! Válido sábado e domingo, enquanto durarem os pães quentinhos.',
      createdAt: ctx.at(-3, 7, 30),
      likes: 10,
      business: 'padaria',
      illustration: 'bakery',
    },
    {
      key: 'atelie',
      author: 'heloisa',
      category: 'commerce',
      content:
        'Chegou a nova coleção do Ateliê Flor de Chita: bolsas, saias e aventais feitos à mão com estampas florais. Venha conhecer, tem peça para todos os gostos!',
      createdAt: ctx.at(-4, 15, 0),
      likes: 7,
      business: 'atelie',
      illustration: 'clothing',
    },
  ]
}

export interface PostsResult {
  posts: Post[]
  /** Id de uma publicação a partir da chave. */
  idOf: Record<PostKey, ID>
}

export function buildPosts(ctx: SeedContext): PostsResult {
  const ordered = postRows(ctx).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const idOf = {} as Record<PostKey, ID>
  const posts: Post[] = ordered.map((row, index) => {
    const id = `pst_${String(index + 1).padStart(2, '0')}`
    idOf[row.key] = id
    return {
      id,
      authorId: uid(row.author),
      ...(row.institution ? { institutionId: INSTITUTIONS[row.institution].id } : {}),
      ...(row.business ? { businessId: BUSINESSES[row.business].id } : {}),
      category: row.category,
      content: row.content,
      ...(row.illustration ? { illustration: row.illustration } : {}),
      neighborhoodId: homeOf(row.author),
      ...(row.demand ? { linkedDemandId: row.demand } : {}),
      ...(row.event ? { linkedEventId: row.event } : {}),
      likedBy: pickLikers(row.likes, index + 2, [row.author]),
      moderation: 'visible' as const,
      createdAt: row.createdAt,
    }
  })
  return { posts, idOf }
}

// ── Comentários ──────────────────────────────────────────────────────────────

interface CommentRow {
  key?: string
  target: { type: 'post'; key: PostKey } | { type: 'demand'; id: ID }
  author: PersonKey
  content: string
  /** Minutos após a criação do alvo. */
  after: number
}

const COMMENT_ROWS: readonly CommentRow[] = [
  {
    target: { type: 'post', key: 'saudeSabado' },
    author: 'ana',
    content: 'Abre sim, das 8h às 12h. Vi o cartaz na porta ontem.',
    after: 15,
  },
  {
    target: { type: 'post', key: 'saudeSabado' },
    author: 'joao',
    content: 'Acho que só urgências aos sábados. Melhor ligar antes de ir.',
    after: 30,
  },
  {
    target: { type: 'post', key: 'saudeSabado' },
    author: 'camila',
    content: 'Obrigada por perguntar, eu também queria saber!',
    after: 42,
  },
  {
    target: { type: 'post', key: 'campanha' },
    author: 'maria',
    content: 'Conta comigo! Vou levar arroz e feijão.',
    after: 40,
  },
  {
    target: { type: 'post', key: 'campanha' },
    author: 'sandra',
    content: 'Obrigada, João! Estamos recebendo alimentos não perecíveis no CRAS, das 9h às 16h.',
    after: 100,
  },
  {
    target: { type: 'post', key: 'mutirao' },
    author: 'antonio',
    content: 'Vou participar! Levo luvas e sacos de lixo.',
    after: 180,
  },
  {
    target: { type: 'post', key: 'mutirao' },
    author: 'beatriz',
    content: 'Moro longe, mas vou divulgar no meu grupo do bairro.',
    after: 600,
  },
  {
    target: { type: 'post', key: 'mutirao' },
    author: 'jorge',
    content: 'A Associação de Moradores apoia! Vamos mobilizar a Vila.',
    after: 1500,
  },
  {
    target: { type: 'post', key: 'dem1' },
    author: 'maria',
    content: 'Também desvio desse buraco todo dia. Já vi uma moto quase cair.',
    after: 240,
  },
  {
    target: { type: 'post', key: 'dem1' },
    author: 'rafael',
    content: 'Apoiado! Semana passada furou o pneu de um vizinho aqui.',
    after: 900,
  },
  {
    target: { type: 'post', key: 'dem1' },
    author: 'roberto',
    content: 'Equipe de vistoria acionada. Obrigado pelo registro, vamos acompanhar.',
    after: 1800,
  },
  {
    key: 'dem1Carla',
    target: { type: 'post', key: 'dem1' },
    author: 'carla',
    content: 'Fica bem na frente da padaria e afasta cliente. Torço para resolverem logo!',
    after: 11880,
  },
  {
    target: { type: 'post', key: 'dem2' },
    author: 'fernanda',
    content: 'No calor o cheiro é insuportável. Precisa de solução definitiva.',
    after: 120,
  },
  {
    target: { type: 'post', key: 'dem2' },
    author: 'joao',
    content: 'Já liguei na coleta duas vezes e nada. Apoiei a demanda.',
    after: 700,
  },
  {
    target: { type: 'post', key: 'dem3' },
    author: 'antonio',
    content: 'A rua fica escura demais na saída das aulas. Preocupa as crianças.',
    after: 90,
  },
  {
    target: { type: 'post', key: 'dem6' },
    author: 'luiz',
    content: 'Verdade, o vazamento só aumenta. Que desperdício de água!',
    after: 600,
  },
  {
    target: { type: 'post', key: 'feira' },
    author: 'carla',
    content: 'Vou levar uns bolinhos para a feira. Será um prazer participar!',
    after: 300,
  },
  {
    target: { type: 'post', key: 'feira' },
    author: 'patricia',
    content: 'Tem inscrição para expositores?',
    after: 700,
  },
  {
    target: { type: 'post', key: 'feira' },
    author: 'jorge',
    content: 'Tem sim, Patrícia! Basta falar com a Associação até quinta-feira.',
    after: 900,
  },
  {
    target: { type: 'post', key: 'mutiraoSaude' },
    author: 'marcos',
    content: 'A Farmácia Popular vai apoiar com aferição de pressão.',
    after: 400,
  },
  {
    target: { type: 'post', key: 'oficina' },
    author: 'camila',
    content: 'Quero participar! Ainda tem vaga?',
    after: 120,
  },
  {
    target: { type: 'post', key: 'oficina' },
    author: 'sandra',
    content: 'Tem sim, Camila! Ainda restam 6 vagas.',
    after: 200,
  },
  {
    target: { type: 'post', key: 'eletricista' },
    author: 'beatriz',
    content: 'Indico o Seu Valdir. Fez minha instalação, foi bem honesto no preço.',
    after: 150,
  },
  {
    target: { type: 'post', key: 'eletricista' },
    author: 'rafael',
    content: 'Concordo, um vizinho meu também recomenda.',
    after: 400,
  },
  {
    target: { type: 'post', key: 'cachorro' },
    author: 'juliana',
    content: 'Que fofo! Será que não tem plaquinha com telefone na coleira antiga?',
    after: 90,
  },
  {
    target: { type: 'post', key: 'rifa' },
    author: 'maria',
    content: 'Isso parece golpe. Cuidado, pessoal, não façam Pix para desconhecidos.',
    after: 60,
  },
  {
    target: { type: 'post', key: 'rifa' },
    author: 'ana',
    content: 'Já denunciei. Rifa sem registro e sem dados do organizador é sempre suspeita.',
    after: 120,
  },
  {
    target: { type: 'post', key: 'padaria' },
    author: 'maria',
    content: 'Já garanti meu café da manhã de sábado!',
    after: 200,
  },
  {
    target: { type: 'demand', id: DEMAND_IDS.pracaLuz },
    author: 'ana',
    content: 'A praça ficou linda com as luzes novas. Obrigada a todos que apoiaram!',
    after: 47520,
  },
  {
    target: { type: 'demand', id: DEMAND_IDS.semaforo },
    author: 'camila',
    content: 'Atravesso aqui todos os dias e é perigoso para os idosos. Apoiei.',
    after: 2000,
  },
  {
    key: 'ofensivo',
    target: { type: 'demand', id: DEMAND_IDS.lixo },
    author: 'luiz',
    content: 'Esses políticos são todos uns ladrões incompetentes, só querem saber de roubar!',
    after: 500,
  },
]

export interface CommentsResult {
  comments: Comment[]
  /** Id de um comentário nomeado. */
  idOfKey: Record<string, ID>
}

export function buildComments(
  ctx: SeedContext,
  posts: readonly Post[],
  idOf: Record<PostKey, ID>,
  demandCreatedAt: Record<ID, ISODate>,
): CommentsResult {
  const postDate = new Map(posts.map((post) => [post.id, post.createdAt]))
  const dated = COMMENT_ROWS.map((row) => {
    const targetId = row.target.type === 'post' ? idOf[row.target.key] : row.target.id
    const base = row.target.type === 'post' ? postDate.get(targetId) : demandCreatedAt[targetId]
    return { row, targetId, createdAt: plusMinutes(ctx, base ?? ctx.now.toISOString(), row.after) }
  })
  dated.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const idOfKey: Record<string, ID> = {}
  const comments: Comment[] = dated.map(({ row, targetId, createdAt }, index) => {
    const id = `cmt_${String(index + 1).padStart(2, '0')}`
    if (row.key) idOfKey[row.key] = id
    return {
      id,
      targetType: row.target.type,
      targetId,
      authorId: uid(row.author),
      content: row.content,
      moderation: 'visible' as const,
      createdAt,
    }
  })
  return { comments, idOfKey }
}

// ── Denúncias ────────────────────────────────────────────────────────────────

export function buildReports(
  ctx: SeedContext,
  idOf: Record<PostKey, ID>,
  commentIds: Record<string, ID>,
): ContentReport[] {
  return [
    {
      id: 'rep_01',
      targetType: 'post',
      targetId: idOf.rifa,
      reporterId: uid('maria'),
      reason: 'spam',
      details:
        'Rifa com promessa de moto por R$ 5, sem nenhuma informação do organizador. Parece golpe.',
      status: 'open',
      createdAt: ctx.ago(60 * 20),
    },
    {
      id: 'rep_02',
      targetType: 'comment',
      targetId: commentIds.ofensivo ?? 'cmt_00',
      reporterId: uid('juliana'),
      reason: 'offensive',
      details: 'Ofensas generalizadas contra pessoas, sem relação com a demanda.',
      status: 'open',
      createdAt: ctx.ago(60 * 30),
    },
    {
      id: 'rep_03',
      targetType: 'post',
      targetId: idOf.padaria,
      reporterId: uid('pedro'),
      reason: 'spam',
      details: 'Parece propaganda.',
      status: 'dismissed',
      createdAt: ctx.at(-2, 9, 0),
      resolvedAt: ctx.at(-2, 14, 30),
      resolvedBy: PEOPLE.helena.id,
    },
  ]
}
