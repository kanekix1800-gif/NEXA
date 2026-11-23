/**
 * CENTRAL DE AJUDA (conteúdo estático)
 * Perguntas e respostas curtas, em linguagem simples.
 */
export interface HelpTopic {
  id: string
  question: string
  /** Parágrafos da resposta. */
  answer: string[]
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'registrar-demanda',
    question: 'Como registrar uma demanda?',
    answer: [
      'Toque em "Nova demanda", descreva o problema, escolha a categoria e marque o local no mapa. Você também pode anexar uma foto.',
      'A NEXA IA pode sugerir categoria, urgência e possíveis instituições responsáveis. São apenas sugestões: você decide o que enviar.',
      'Depois de registrada, a demanda recebe um protocolo (por exemplo, NX-2026-0013) para você acompanhar o andamento.',
    ],
  },
  {
    id: 'acompanhar-demanda',
    question: 'Como acompanho o andamento de uma demanda?',
    answer: [
      'Abra a demanda em "Minhas demandas" ou pelo mapa. A linha do tempo mostra cada etapa: registrada, em análise, em andamento, resolvida ou encerrada.',
      'No modo demonstração, as atualizações das instituições são simuladas e identificadas como tal. Não há integração real com órgãos públicos.',
    ],
  },
  {
    id: 'modo-demonstracao',
    question: 'O que é o modo demonstração?',
    answer: [
      'O NEXA é um protótipo. Todas as pessoas, comércios, instituições, notícias e ocorrências que aparecem aqui são fictícios e existem apenas para demonstrar o produto.',
      'Os dados ficam salvos somente neste aparelho, no navegador. Nada é enviado a servidores nem a órgãos públicos.',
    ],
  },
  {
    id: 'restaurar-dados',
    question: 'Como restauro os dados de demonstração?',
    answer: [
      'Em Configurações, use a opção "Restaurar dados de demonstração". Isso apaga o que você criou neste aparelho e recarrega a base original, com as datas atualizadas para hoje.',
      'A ação não pode ser desfeita. Se quiser guardar uma cópia antes, use a opção de exportar seus dados.',
    ],
  },
  {
    id: 'contas-demo',
    question: 'Quais contas posso usar para testar?',
    answer: [
      'Na tela de entrada há acessos rápidos para quatro perfis: morador, comerciante, instituição e administrador. Cada um mostra uma parte diferente do NEXA.',
      'Você também pode criar uma conta nova. Ela fica apenas neste aparelho.',
    ],
  },
  {
    id: 'privacidade-lgpd',
    question: 'Como meus dados são tratados (privacidade e LGPD)?',
    answer: [
      'Tratamos apenas o necessário para o app funcionar: dados de cadastro, suas publicações, demandas, eventos e preferências. No protótipo, tudo fica armazenado no seu navegador.',
      'A localização só é usada se você autorizar e é arredondada para não revelar seu endereço exato. Você pode exportar ou excluir seus dados quando quiser, em Configurações.',
    ],
  },
  {
    id: 'divulgar-negocio',
    question: 'Como divulgo meu negócio no NEXA?',
    answer: [
      'Com uma conta de comerciante, cadastre o estabelecimento: nome, categoria, endereço, horário de funcionamento e contatos. Ele passa a aparecer no catálogo e no mapa, na camada Comércio.',
      'Você pode publicar promoções no feed, cadastrar seus produtos e acompanhar as avaliações dos moradores.',
    ],
  },
  {
    id: 'nexa-business',
    question: 'O que posso fazer no NEXA Business?',
    answer: [
      'O NEXA Business ajuda a organizar o dia a dia: cadastre produtos com preço e estoque, registre vendas, acompanhe o caixa e veja indicadores simples como faturamento e itens mais vendidos.',
      'Os recursos avançados de análise fazem parte de um plano futuro, ainda sem preço definido.',
    ],
  },
  {
    id: 'nexa-ia',
    question: 'Como funciona a NEXA IA?',
    answer: [
      'A NEXA IA é uma assistente que ajuda a escrever demandas, entender o que acontece na sua região e, para comerciantes, interpretar os números do negócio.',
      'No modo demonstração ela usa regras locais, sem enviar seus dados para fora. As respostas são sugestões e podem conter imprecisões: confira sempre as informações importantes.',
    ],
  },
  {
    id: 'denunciar-conteudo',
    question: 'Como denuncio um conteúdo inadequado?',
    answer: [
      'No menu de uma publicação ou de um comentário, escolha "Denunciar" e informe o motivo: spam, ofensa, informação falsa, exposição de dados pessoais ou outro.',
      'A equipe de moderação analisa o caso e pode ocultar o conteúdo. Você não precisa se identificar para o autor.',
    ],
  },
  {
    id: 'acessibilidade',
    question: 'Como deixo o NEXA mais acessível para mim?',
    answer: [
      'Abra Perfil → Acessibilidade (ou o atalho na tela inicial, na abertura e na tela Entrar). Lá você aumenta o texto, liga o alto contraste, troca a fonte, reduz animações e escolhe sons e vibração.',
      'Para ouvir o aplicativo, ligue "Falar o nome de cada tela", "Ler o que eu tocar" e o botão "Ouvir tela". Se você já usa TalkBack ou VoiceOver, deixe essas opções desligadas: o NEXA já avisa o seu leitor a cada troca de tela.',
      'As opções valem para o aparelho, funcionam antes mesmo de entrar na conta e ficam guardadas somente nele.',
    ],
  },
  {
    id: 'mobilidade-acessivel',
    question: 'Onde vejo ônibus acessíveis e barreiras no caminho?',
    answer: [
      'Em Mobilidade acessível (na tela inicial e no Perfil). A aba Ônibus mostra as linhas com elevador, piso baixo e aviso sonoro, com as próximas partidas e as paradas.',
      'A aba No caminho lista escadas, degraus e outros obstáculos — com um caminho alternativo — e também rampas, elevadores, piso tátil e semáforos sonoros. A aba Alertas avisa por voz, som e vibração quando você se aproxima de uma barreira; a simulação mostra como funciona.',
      'Na base de demonstração, linhas, horários e pontos são fictícios.',
    ],
  },
  {
    id: 'sem-internet',
    question: 'Posso usar o NEXA sem internet?',
    answer: [
      'Depois do primeiro acesso, o app pode ser aberto sem conexão e continua funcionando com os dados salvos no aparelho. Recursos que dependem de internet, como o mapa online, podem ficar limitados.',
    ],
  },
]
