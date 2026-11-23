import { paths } from '@/app/paths'
import type { AppNotification, Demand, ID, Initiative, ISODate, NewsArticle } from '@/types'

import { BUSINESSES, DEMO_NEWS_SOURCE, INSTITUTIONS, NEIGHBORHOODS } from '../cast'
import type { SeedContext } from '../context'
import { DEMAND_IDS } from './demands'
import { EVENT_IDS } from './events'
import type { PostKey } from './posts'
import { uid } from './shared'

// ── Iniciativas ──────────────────────────────────────────────────────────────

export function buildInitiatives(ctx: SeedContext): Initiative[] {
  return [
    {
      id: 'ini_01',
      institutionId: INSTITUTIONS.prefeitura.id,
      title: 'Programa Bairro Limpo',
      description:
        'Mutirões de limpeza, reforço da coleta seletiva e pontos de entrega voluntária de entulho em todos os bairros. Moradores podem registrar locais de descarte irregular pelo NEXA e acompanhar o atendimento.',
      illustration: 'cleanup',
      status: 'active',
      createdBy: uid('roberto'),
      createdAt: ctx.at(-20, 10, 0),
    },
    {
      id: 'ini_02',
      institutionId: INSTITUTIONS.vivaMelhor.id,
      title: 'Cozinha Solidária',
      description:
        'Refeições gratuitas servidas três vezes por semana para famílias em situação de vulnerabilidade, com preparo feito por voluntários e alimentos doados pela comunidade. Quer ajudar? Procure a equipe da ONG.',
      illustration: 'donation',
      status: 'active',
      createdBy: uid('sandra'),
      createdAt: ctx.at(-34, 9, 30),
    },
    {
      id: 'ini_03',
      institutionId: INSTITUTIONS.vivaMelhor.id,
      title: 'Reforço Escolar Comunitário',
      description:
        'Aulas de apoio em português e matemática para crianças do ensino fundamental, aos sábados de manhã, conduzidas por professores e estudantes voluntários. Vagas gratuitas para moradores do Jardim das Flores e arredores.',
      illustration: 'workshop',
      status: 'active',
      createdBy: uid('sandra'),
      createdAt: ctx.at(-52, 14, 0),
    },
    {
      id: 'ini_04',
      institutionId: INSTITUTIONS.associacao.id,
      title: 'Horta Comunitária da Vila',
      description:
        'Um terreno cedido pela vizinhança virou horta coletiva. Moradores plantam, cuidam e dividem a colheita. A associação organiza escalas de cuidado e oficinas de compostagem.',
      illustration: 'meeting',
      status: 'active',
      createdBy: uid('jorge'),
      createdAt: ctx.at(-41, 16, 0),
    },
  ]
}

// ── Notificações ─────────────────────────────────────────────────────────────

export function buildNotifications(
  ctx: SeedContext,
  demands: readonly Demand[],
  postIdOf: Record<PostKey, ID>,
  commentDates: Record<string, ISODate>,
): AppNotification[] {
  const demand = (id: ID): Demand => {
    const found = demands.find((candidate) => candidate.id === id)
    if (!found) throw new Error(`Demanda ${id} não encontrada na base.`)
    return found
  }
  const lastUpdate = (id: ID): ISODate =>
    demand(id).history[demand(id).history.length - 1]?.createdAt ?? ctx.now.toISOString()
  const protocol = (id: ID): string => demand(id).protocol
  const after = (iso: ISODate, minutes: number): ISODate =>
    new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

  const antonio = uid('antonio')
  const carla = uid('carla')
  const roberto = uid('roberto')
  const helena = uid('helena')

  return [
    // ── Antonio (morador) ──
    {
      id: 'ntf_01',
      userId: antonio,
      category: 'demands',
      title: 'Sua demanda recebeu uma nova atualização.',
      body: `A Prefeitura Municipal atualizou o andamento da demanda ${protocol(DEMAND_IDS.buraco)}: o reparo do pavimento foi programado e a equipe está no local. (Atualização simulada.)`,
      link: paths.demand(DEMAND_IDS.buraco),
      read: false,
      createdAt: after(lastUpdate(DEMAND_IDS.buraco), 3),
    },
    {
      id: 'ntf_02',
      userId: antonio,
      category: 'community',
      title: 'Uma pessoa comentou sua publicação.',
      body: 'Carla Mendes comentou na publicação da sua demanda sobre o buraco na Rua das Acácias.',
      link: paths.post(postIdOf.dem1),
      read: false,
      createdAt: after(commentDates.dem1Carla ?? ctx.ago(1200), 1),
    },
    {
      id: 'ntf_03',
      userId: antonio,
      category: 'events',
      title: 'Um evento comunitário acontecerá amanhã.',
      body: 'Mutirão de Revitalização da Praça, amanhã, das 8h às 12h, na praça do Jardim das Flores. Sua presença está confirmada.',
      link: paths.event(EVENT_IDS.mutirao),
      read: false,
      createdAt: ctx.ago(420),
    },
    {
      id: 'ntf_04',
      userId: antonio,
      category: 'institutions',
      title: 'Prefeitura Municipal divulgou uma nova iniciativa.',
      body: 'Conheça o Programa Bairro Limpo: mutirões, coleta seletiva e pontos de entrega de entulho.',
      link: paths.institution(INSTITUTIONS.prefeitura.id),
      read: false,
      createdAt: ctx.at(-1, 10, 5),
    },
    {
      id: 'ntf_05',
      userId: antonio,
      category: 'demands',
      title: 'Sua demanda recebeu um novo apoio.',
      body: `Mais um vizinho apoiou a demanda ${protocol(DEMAND_IDS.buraco)}. Agora são 11 apoios.`,
      link: paths.demand(DEMAND_IDS.buraco),
      read: true,
      createdAt: ctx.at(-6, 16, 20),
    },
    {
      id: 'ntf_06',
      userId: antonio,
      category: 'events',
      title: 'A Associação de Moradores criou um novo evento.',
      body: 'Sarau Cultural da Vila, na Escola Municipal Paulo Freire. Veja a data e confirme presença.',
      link: paths.event(EVENT_IDS.sarau),
      read: true,
      createdAt: ctx.at(-2, 11, 30),
    },
    {
      id: 'ntf_07',
      userId: antonio,
      category: 'commerce',
      title: 'Novidade em um comércio que você favoritou.',
      body: 'A Farmácia Popular está com entrega gratuita para o Centro e bairros próximos.',
      link: paths.business(BUSINESSES.farmacia.id),
      read: true,
      createdAt: ctx.at(-3, 9, 45),
    },
    {
      id: 'ntf_08',
      userId: antonio,
      category: 'system',
      title: 'Boas-vindas ao NEXA!',
      body: 'Conheça o app: registre demandas, apoie o comércio local e participe de eventos do seu bairro. Este é um ambiente de demonstração.',
      link: paths.home,
      read: true,
      createdAt: ctx.at(-176, 10, 20),
    },

    // ── Carla (comerciante) ──
    {
      id: 'ntf_09',
      userId: carla,
      category: 'commerce',
      title: 'Seu estabelecimento recebeu uma avaliação.',
      body: 'Padaria do Bairro recebeu uma nova avaliação de 5 estrelas.',
      link: paths.business(BUSINESSES.padaria.id),
      read: false,
      createdAt: ctx.at(-9, 7, 5),
    },
    {
      id: 'ntf_10',
      userId: carla,
      category: 'commerce',
      title: 'Estoque baixo',
      body: 'Croissant está com apenas 9 unidades em estoque (mínimo: 12). Considere repor.',
      link: paths.businessProducts,
      read: false,
      createdAt: ctx.ago(300),
    },
    {
      id: 'ntf_11',
      userId: carla,
      category: 'system',
      title: 'Dica do NEXA Business',
      body: 'Veja nos Insights quais produtos mais vendem e em que horários sua padaria tem mais movimento.',
      link: paths.businessInsights,
      read: true,
      createdAt: ctx.at(-12, 9, 0),
    },

    // ── Roberto (instituição) ──
    {
      id: 'ntf_12',
      userId: roberto,
      category: 'demands',
      title: 'Nova demanda encaminhada',
      body: `Poste apagado em frente à escola (${protocol(DEMAND_IDS.poste)}) foi encaminhada à Prefeitura Municipal.`,
      link: paths.demand(DEMAND_IDS.poste),
      read: false,
      createdAt: after(demand(DEMAND_IDS.poste).createdAt, 4),
    },
    {
      id: 'ntf_13',
      userId: roberto,
      category: 'demands',
      title: 'Nova demanda encaminhada',
      body: `Bueiro entupido na Rua do Ipê Amarelo (${protocol(DEMAND_IDS.bueiro)}) foi encaminhada à Prefeitura Municipal.`,
      link: paths.demand(DEMAND_IDS.bueiro),
      read: false,
      createdAt: after(demand(DEMAND_IDS.bueiro).createdAt, 4),
    },

    // ── Helena (administração) ──
    {
      id: 'ntf_14',
      userId: helena,
      category: 'system',
      title: 'Nova denúncia de conteúdo para revisão',
      body: 'Uma publicação foi denunciada como spam e aguarda análise da moderação.',
      link: paths.adminModeration,
      read: false,
      createdAt: ctx.ago(60 * 20),
    },
    {
      id: 'ntf_15',
      userId: helena,
      category: 'system',
      title: 'Resumo semanal da comunidade',
      body: 'Esta semana foram registradas novas demandas, publicações e eventos. Veja os indicadores no painel.',
      link: paths.admin,
      read: true,
      createdAt: ctx.at(-1, 8, 0),
    },
  ]
}

// ── Notícias ─────────────────────────────────────────────────────────────────

export function buildNews(ctx: SeedContext): NewsArticle[] {
  return [
    {
      id: 'new_01',
      title: 'Novo ponto de ônibus no centro!',
      summary:
        'Abrigo coberto com banco foi instalado na Avenida Principal, atendendo a pedido de moradores.',
      body: [
        'Moradores do Centro já contam com um novo abrigo de ônibus na Avenida Principal. A estrutura tem cobertura, banco e painel de linhas, e foi instalada depois de um pedido registrado por um morador no NEXA e apoiado por outros nove vizinhos.',
        'Até então, quem esperava o ônibus ali ficava exposto ao sol forte e à chuva, em especial idosos e crianças a caminho da escola. O pedido foi analisado pela secretaria de mobilidade e a obra foi concluída em poucas semanas.',
        'O morador autor da demanda comemorou: segundo ele, o resultado mostra que a participação de todos faz diferença. A prefeitura informou que outros pontos da cidade serão avaliados na sequência.',
        'Esta notícia é parte do conteúdo demonstrativo do NEXA e descreve ocorrências fictícias.',
      ],
      tag: 'Mobilidade',
      illustration: 'bus-stop',
      neighborhoodId: NEIGHBORHOODS.centro.id,
      publishedAt: ctx.ago(120),
      source: DEMO_NEWS_SOURCE,
    },
    {
      id: 'new_02',
      title: 'Mutirão de limpeza comunitária reúne moradores',
      summary:
        'Voluntários recolheram entulho e plantaram mudas em uma manhã de trabalho coletivo.',
      body: [
        'Mais de cinquenta moradores participaram de um mutirão de limpeza comunitária no Parque das Águas. Em uma manhã, foram recolhidos sacos de lixo, entulho e objetos descartados de forma irregular em terrenos e calçadas.',
        'A ação foi organizada por vizinhos em parceria com a prefeitura, que cedeu caçambas, luvas e equipamentos. Ao final, o grupo plantou mudas de ipê e sibipiruna ao longo de um trecho da avenida.',
        'Participantes contaram que a ideia é repetir o mutirão todo mês e ampliar a coleta seletiva no bairro. Quem quiser se juntar à próxima ação pode acompanhar os eventos do NEXA.',
      ],
      tag: 'Meio ambiente',
      illustration: 'cleanup',
      neighborhoodId: NEIGHBORHOODS.parque.id,
      publishedAt: ctx.at(-1, 11, 0),
      source: DEMO_NEWS_SOURCE,
    },
    {
      id: 'new_03',
      title: 'Feira de empreendedorismo abre inscrições',
      summary:
        'Pequenos negócios do bairro podem reservar estande na feira que acontece na Praça da Matriz.',
      body: [
        'Estão abertas as inscrições para expositores da Feira de Empreendedorismo, que acontece na Praça da Matriz, no Centro. Padarias, ateliês, salões e outros pequenos negócios da região podem reservar estande gratuitamente.',
        'Além da exposição, a programação inclui palestras curtas sobre gestão financeira, precificação e vendas, além de orientação individual para quem está começando a empreender.',
        'A feira é organizada pela Associação de Moradores e a entrada é gratuita para o público. Confirme presença na página do evento no NEXA.',
      ],
      tag: 'Empreendedorismo',
      illustration: 'fair',
      neighborhoodId: NEIGHBORHOODS.centro.id,
      publishedAt: ctx.at(-2, 9, 30),
      source: DEMO_NEWS_SOURCE,
      linkedEventId: EVENT_IDS.feira,
    },
    {
      id: 'new_04',
      title: 'Campanha de vacinação começa na UBS Central',
      summary:
        'Unidade de saúde atende com horário estendido e atualiza a caderneta de vacinação de crianças e adultos.',
      body: [
        'A UBS Central iniciou uma campanha de vacinação que vai atualizar a caderneta de crianças, adolescentes e adultos. O atendimento acontece em horário estendido durante a semana e não exige agendamento.',
        'A equipe de saúde recomenda levar um documento com foto e o cartão de vacinação. Quem não tiver o cartão pode procurar a unidade para fazer a consulta do histórico.',
        'Durante a campanha, também serão feitas orientações sobre prevenção e cuidados básicos de saúde, em ações que reúnem agentes comunitários e voluntários dos bairros.',
        'Conteúdo demonstrativo: as informações desta notícia são fictícias.',
      ],
      tag: 'Saúde',
      illustration: 'vaccination',
      neighborhoodId: NEIGHBORHOODS.centro.id,
      publishedAt: ctx.at(-3, 8, 30),
      source: DEMO_NEWS_SOURCE,
    },
    {
      id: 'new_05',
      title: 'Praça do Jardim das Flores recebe nova iluminação',
      summary:
        'Lâmpadas de LED substituem as antigas e devolvem o uso noturno do espaço aos moradores.',
      body: [
        'A praça do Jardim das Flores ganhou iluminação nova. As lâmpadas antigas, fracas ou queimadas, foram trocadas por luminárias de LED, mais econômicas e com luz mais clara.',
        'A troca atende a uma demanda registrada no NEXA por uma moradora, que reuniu 12 apoios. Desde a instalação, vizinhos relatam que voltaram a usar a praça à noite para caminhar e levar as crianças.',
        'A prefeitura informou que a modernização será levada, aos poucos, a outras praças do município.',
      ],
      tag: 'Infraestrutura',
      illustration: 'street-lights',
      neighborhoodId: NEIGHBORHOODS.jardim.id,
      publishedAt: ctx.at(-10, 10, 0),
      source: DEMO_NEWS_SOURCE,
    },
    {
      id: 'new_06',
      title: 'Oficina gratuita ensina educação financeira',
      summary:
        'Biblioteca Comunitária recebe aula prática sobre orçamento da casa, dívidas e como começar a poupar.',
      body: [
        'A Biblioteca Comunitária vai receber uma oficina gratuita de educação financeira para moradores de todos os bairros. A aula é prática e explica como montar o orçamento da casa e planejar o uso do dinheiro.',
        'Entre os temas estão: como sair do vermelho, cuidados com o cartão de crédito e dicas para começar a poupar mesmo com renda apertada. Cada participante recebe material impresso.',
        'A oficina é organizada pela ONG Viva Melhor e tem 20 vagas. A inscrição é feita pela página do evento, no NEXA.',
      ],
      tag: 'Educação',
      illustration: 'workshop',
      neighborhoodId: NEIGHBORHOODS.centro.id,
      publishedAt: ctx.at(-4, 14, 0),
      source: DEMO_NEWS_SOURCE,
      linkedEventId: EVENT_IDS.oficina,
    },
  ]
}
