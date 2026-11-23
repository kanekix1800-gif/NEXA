/**
 * TERMOS DE USO E AVISO DE PRIVACIDADE (conteúdo estático)
 * Textos honestos para um protótipo de demonstração: o NEXA não coleta dados em
 * servidores; tudo permanece no dispositivo.
 */
export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'sobre',
    title: 'Sobre este protótipo',
    paragraphs: [
      'O NEXA é um protótipo de demonstração criado para apresentar uma ideia: conectar moradores, comércio local e instituições. Não é um serviço público oficial nem um produto comercial em operação.',
    ],
  },
  {
    id: 'conteudo-ficticio',
    title: 'Contas e conteúdos fictícios',
    paragraphs: [
      'Pessoas, estabelecimentos, instituições, notícias, demandas, eventos e avaliações exibidos na base inicial são fictícios. Qualquer semelhança com pessoas ou lugares reais é coincidência.',
      'Instituições citadas, inclusive a de apoio a empreendedores, aparecem apenas como exemplo: não há parceria oficial com nenhuma delas.',
    ],
  },
  {
    id: 'status-simulados',
    title: 'Atualizações institucionais simuladas',
    paragraphs: [
      'As mudanças de situação de uma demanda feitas por contas institucionais são simuladas. Nenhuma demanda registrada aqui é enviada a prefeituras ou outros órgãos, e não há prazo ou compromisso de atendimento.',
    ],
  },
  {
    id: 'uso-adequado',
    title: 'Uso adequado',
    paragraphs: [
      'Ao usar o app, você se compromete a não publicar conteúdo ofensivo, ilegal ou enganoso, nem dados pessoais de terceiros. Conteúdos denunciados podem ser ocultados pela moderação.',
      'Você é responsável pelo que publica neste aparelho. Evite informar endereços, documentos ou telefones reais durante a demonstração.',
    ],
  },
  {
    id: 'ia',
    title: 'Respostas da NEXA IA',
    paragraphs: [
      'A assistente oferece sugestões e pode errar. Não substitui orientação profissional, jurídica, médica ou financeira. Confira sempre as informações importantes.',
    ],
  },
  {
    id: 'planos',
    title: 'Planos',
    paragraphs: [
      'Os planos apresentados são ilustrativos. Não há cobrança, pagamento ou contratação no protótipo, e os valores dos planos pagos ainda não foram definidos.',
    ],
  },
  {
    id: 'alteracoes',
    title: 'Alterações e disponibilidade',
    paragraphs: [
      'O protótipo pode mudar ou ser encerrado a qualquer momento, sem aviso. Sem garantias de disponibilidade ou de preservação dos dados.',
    ],
  },
]

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'onde-ficam',
    title: 'Onde seus dados ficam',
    paragraphs: [
      'Todos os dados do NEXA ficam armazenados apenas neste dispositivo, no navegador. No modo demonstração não há servidor que receba, guarde ou compartilhe suas informações.',
    ],
  },
  {
    id: 'quais-dados',
    title: 'Quais dados são tratados',
    paragraphs: [
      'Cadastro: nome, nome de usuário, e-mail, bairro e, opcionalmente, foto e biografia. A senha é guardada somente como derivação criptográfica, nunca em texto puro.',
      'Atividade: publicações, comentários, curtidas, demandas, apoios, presenças em eventos, favoritos, avaliações e, para comerciantes, produtos, vendas e lançamentos financeiros.',
      'Preferências: configurações de notificação, de movimento e de localização.',
    ],
  },
  {
    id: 'localizacao',
    title: 'Localização',
    paragraphs: [
      'A localização do dispositivo só é usada se você autorizar. Ela serve para calcular distâncias e é arredondada, para não revelar seu endereço exato. Você pode revogar a autorização a qualquer momento.',
    ],
  },
  {
    id: 'visibilidade',
    title: 'O que outras pessoas veem',
    paragraphs: [
      'Seu perfil público mostra nome, nome de usuário, bairro, biografia e avatar. Seu e-mail e seus dados de contato não são exibidos a outros usuários.',
    ],
  },
  {
    id: 'ia',
    title: 'NEXA IA',
    paragraphs: [
      'No modo demonstração, a assistente funciona com regras locais e não envia suas mensagens para fora do aparelho. Se um provedor de IA for configurado no futuro, você será avisado antes do envio de qualquer dado.',
    ],
  },
  {
    id: 'acessibilidade',
    title: 'Acessibilidade, voz e microfone',
    paragraphs: [
      'As opções de acessibilidade (tamanho do texto, contraste, voz, sons, vibração e o que destacar para você) ficam guardadas somente neste aparelho e não fazem parte dos dados da sua conta. Não registramos nenhuma informação sobre deficiência.',
      'A leitura em voz alta é feita pela voz do próprio aparelho. O ditado por voz, quando ligado por você, usa o reconhecimento de fala do navegador, que pode enviar o áudio ao serviço do fabricante para convertê-lo em texto; o NEXA não grava nem guarda esse áudio.',
      'Nos alertas de barreiras, a sua posição é usada apenas enquanto a tela está aberta, para medir a distância até os pontos cadastrados. Ela não é guardada nem enviada.',
    ],
  },
  {
    id: 'seus-direitos',
    title: 'Exportar e excluir seus dados',
    paragraphs: [
      'Em Configurações, você pode exportar uma cópia dos seus dados, excluir sua conta ou restaurar a base de demonstração. A exclusão apaga o que está armazenado neste aparelho.',
      'Como os dados não saem do dispositivo, limpar os dados do navegador também remove tudo.',
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    paragraphs: [
      'Adotamos cuidados básicos, como a proteção das senhas. Ainda assim, quem tiver acesso ao aparelho pode ter acesso aos dados salvos. Não use dados reais ou sensíveis nesta demonstração.',
    ],
  },
  {
    id: 'contato',
    title: 'Dúvidas',
    paragraphs: [
      'Por ser um protótipo, não há canal oficial de atendimento. Dúvidas sobre o projeto devem ser enviadas à equipe responsável pela apresentação.',
    ],
  },
]
