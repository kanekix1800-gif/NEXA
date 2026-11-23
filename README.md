# NEXA — Conexões que transformam realidades

O NEXA é uma plataforma comunitária que conecta **moradores, comércio local, instituições e poder público** em um único aplicativo: o morador registra problemas do bairro e acompanha o andamento, a comunidade conversa e se organiza, o comerciante divulga e administra o negócio, e as instituições enxergam o que o bairro precisa.

Este repositório contém um **protótipo funcional** criado para um hackathon. Ele é mobile-first, roda inteiro no navegador e pode ser instalado na tela inicial do celular.

> **É um ambiente de demonstração.** Pessoas, estabelecimentos, endereços, números e notícias são fictícios. Não há parceria oficial com prefeituras ou outras organizações citadas, e os status "institucionais" das demandas são simulados e identificados como tal na interface.

## Experimente em um minuto

1. Abra o site publicado (ou rode localmente — veja [Como executar](#como-executar)).
2. Toque em **Entrar** e escolha um perfil em **Acesso rápido**. Não precisa de cadastro nem de senha.

| Perfil                                                            | O que mostra                                                        | E-mail                  | Link direto                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------- | --------------------------- |
| Morador (Antonio Silva)                                           | Comunidade, demandas, mapa, comércio, eventos e NEXA IA             | `morador@nexa.demo`     | `#/entrar?demo=resident`    |
| Comerciante (Carla Mendes, Padaria do Bairro)                     | NEXA Business: produtos, vendas, estoque, finanças e IA empresarial | `comerciante@nexa.demo` | `#/entrar?demo=merchant`    |
| Instituição (Roberto Nunes, Prefeitura Municipal de demonstração) | Painel institucional e atualização de demandas                      | `instituicao@nexa.demo` | `#/entrar?demo=institution` |
| Administrador (Helena Duarte, equipe NEXA)                        | Indicadores, moderação, categorias e usuários                       | `admin@nexa.demo`       | `#/entrar?demo=admin`       |

Senha de todas as contas demonstrativas: **`nexa1234`**. Ela é pública de propósito, porque as contas só existem para a demonstração.

O link direto entra no perfil sem passar pela tela de login. Basta acrescentá-lo ao endereço do site, por exemplo `https://SEU-USUARIO.github.io/NEXA/#/entrar?demo=merchant`. Se o aparelho já estiver em outro perfil, o link troca para o perfil pedido.

### QR Code para os jurados

O próprio aplicativo gera o QR Code de acesso. Na tela de abertura, na tela **Entrar** ou em **Perfil → Ajuda e Suporte**, toque em **Abrir em outro aparelho**. O código pode levar à tela inicial ou direto a um dos quatro perfis. Ele é gerado no aparelho, sem serviços externos, e sempre aponta para o endereço em que o site está publicado.

Cada aparelho guarda a sua própria cópia dos dados. O que um jurado cria no celular dele não aparece no celular de outro, e nada é enviado a servidores.

## Roteiro de demonstração (cerca de 5 minutos)

Dica: deixe uma segunda aba já aberta no perfil de comerciante (`#/entrar?demo=merchant`) para não gastar tempo trocando de conta.

| Tempo       | O que mostrar                                                                                                                                                  | Caminho na tela                                                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 – 0:30 | **Proposta.** Abertura com a marca e entrada pelo acesso rápido.                                                                                               | Abertura → **Entrar** → **Entrar como morador**                                                                                                                           |
| 0:30 – 1:30 | **O morador registra um problema.** Categoria, relato, sugestões da NEXA IA (prioridade, instituição provável, demandas parecidas), local no mapa e protocolo. | **Demandas** → **Registrar demanda** → "Buraco na rua" → título e descrição → **Pedir sugestões à NEXA IA** → tocar no mapa → **Enviar demanda** → **Acompanhar demanda** |
| 1:30 – 2:10 | **A comunidade enxerga.** A demanda aparece no feed e no mapa. Curtir, comentar e filtrar.                                                                     | **Comunidade** (publicação automática da demanda) → **Mapa** (camadas Problemas, Comércio, Instituições, Eventos e Serviços)                                              |
| 2:10 – 2:45 | **Comércio e eventos.** Vitrine do estabelecimento, favoritos e presença em evento.                                                                            | **Comércio Local** → Padaria do Bairro → favoritar · **Eventos** → abrir um evento → **Confirmar participação**                                                           |
| 2:45 – 3:10 | **NEXA IA.** Resposta com dados do aplicativo e atalhos para as telas.                                                                                         | **NEXA IA** → "Sugerir comércios perto de mim"                                                                                                                            |
| 3:10 – 4:10 | **O comerciante administra o negócio.** Painel com faturamento e gráficos, venda que baixa o estoque e recomendações.                                          | Perfil de comerciante → **NEXA Business** → **Vendas** → **Registrar venda** → **Conferir estoque** → aba **NEXA IA**                                                     |
| 4:10 – 4:45 | **Instituição e administração.** A instituição atualiza o status (o morador é notificado) e a equipe modera denúncias.                                         | Perfil de instituição → **Painel institucional** → abrir uma demanda → **Atualizar status** · Perfil de administrador → **Moderação**                                     |
| 4:45 – 5:00 | **Fechamento.** Modelo de planos, privacidade e próximos passos.                                                                                               | **Perfil** → **Planos** · **Configurações**                                                                                                                               |

Para recomeçar a demonstração do zero: **Perfil → Configurações → Restaurar dados demonstrativos** (também disponível na tela **Entrar**).

## Funcionalidades

Tudo o que está listado abaixo funciona no protótipo, com os dados guardados no aparelho.

### Acesso e perfis

- Abertura, apresentação em quatro etapas, cadastro com e-mail e senha, login e recuperação de senha (simulada: nenhum e-mail é enviado).
- Quatro perfis com permissões separadas: morador, comerciante, instituição e administrador. Áreas restritas mostram uma página de acesso negado em vez de falhar em silêncio.

### Comunidade

- Feed com publicações por categoria (discussões, eventos, demandas, iniciativas sociais e comércio local), fotos, curtidas, comentários, filtro e denúncia de conteúdo.

### Demandas

- Registro em três etapas (categoria, relato e local no mapa, com uso opcional da localização do aparelho), protocolo no formato `NX-AAAA-NNNN`, apoio de outros moradores, comentários e histórico.
- Status: registrada, em análise, em andamento, resolvida e encerrada, com transições validadas.
- Sugestões da NEXA IA no registro: prioridade, instituição provável e demandas parecidas já abertas.

### Mapa inteligente

- OpenStreetMap com cinco camadas que podem ser ligadas e desligadas (problemas, comércios, instituições, eventos e serviços), cartão de detalhes ao tocar em um ponto e atalhos "ver no mapa" a partir das outras telas.

### Comércio local

- Catálogo com busca, categorias, "abertos agora", distância, favoritos, avaliações, produtos e horários. Cadastro e edição do estabelecimento pelo comerciante.

### NEXA Business (comerciantes)

- Painel com faturamento, ticket médio e gráficos; produtos com controle de estoque e alerta de estoque baixo; registro de vendas com baixa automática de estoque; receitas e despesas; recomendações calculadas a partir dos registros.

### NEXA IA

- Conversa com sugestões de perguntas, respostas com atalhos para as telas e histórico. Veja [NEXA IA: modos de funcionamento](#nexa-ia-modos-de-funcionamento).

### Instituições

- Diretório de instituições e serviços públicos, iniciativas e painel institucional com as demandas encaminhadas, indicadores e atualização de status.

### Eventos, notificações e perfil

- Eventos com criação, edição e confirmação de presença. Central de notificações com filtros e preferências por tipo.
- Perfil com publicações, demandas, eventos e favoritos, edição de dados, planos, ajuda e configurações.

### Administração

- Indicadores, moderação de denúncias, categorias, demandas, eventos, usuários e verificação de instituições.

### Planos

- Apresentação dos planos Comunidade, Business, Business Premium e Institucional. Planos pagos exibem "Preço a definir" e não há cobrança.

### Base demonstrativa

A base inicial tem 24 usuários (12 moradores), 8 estabelecimentos, 4 instituições, 8 serviços públicos, 15 publicações, 12 demandas, 8 eventos, 15 notificações e cerca de dois meses de vendas da Padaria do Bairro. As datas são relativas ao dia do acesso: ao abrir o aplicativo em outro dia, toda a base avança junto e continua atual.

## Tecnologias

| Área                   | Escolha                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Interface              | React 19, TypeScript 7, Vite 8, Tailwind CSS 4, Motion, Lucide, Radix UI, Sonner        |
| Navegação              | React Router 8 com rotas por hash, carregadas sob demanda                               |
| Dados                  | Camada de repositórios com contratos tipados, IndexedDB (idb-keyval) e TanStack Query 5 |
| Mapas e gráficos       | Leaflet, React Leaflet e OpenStreetMap; Recharts                                        |
| Aplicativo instalável  | vite-plugin-pwa (Workbox)                                                               |
| Qualidade              | Vitest, Testing Library, Playwright, oxlint (com regras de acessibilidade) e Prettier   |
| Backend opcional da IA | Node.js e SDK oficial da Anthropic                                                      |

## Como executar

Requisito: **Node.js 24** (a mesma versão usada na publicação automática).

```bash
npm install        # instala as dependências
npm run dev        # abre em http://localhost:5173
```

Nenhuma configuração é obrigatória. Sem arquivo `.env`, o aplicativo roda em modo demonstração.

| Comando             | O que faz                                  |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento                |
| `npm run build`     | Verifica os tipos e gera o site em `dist/` |
| `npm run preview`   | Serve o build em `http://localhost:4173`   |
| `npm run typecheck` | Verificação de tipos                       |
| `npm run lint`      | Análise estática                           |
| `npm run format`    | Formata o código                           |
| `npm test`          | Testes unitários e de integração           |
| `npm run test:e2e`  | Testes ponta a ponta                       |
| `npm run ai:server` | Serviço opcional da NEXA IA                |

Para testar no celular durante o desenvolvimento, use `npm run dev -- --host` e abra o endereço de rede exibido. Alguns recursos do navegador, como localização e a proteção de senhas, exigem `localhost` ou HTTPS.

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste o que precisar. Todas são opcionais.

| Variável                                     | Onde vale     | Para que serve                                                           |
| -------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `VITE_AI_API_URL`                            | Site          | Endereço do serviço da NEXA IA. Vazio = assistente em modo demonstrativo |
| `VITE_MAP_CENTER_LAT`, `VITE_MAP_CENTER_LNG` | Site          | Centro do mapa. Os pontos demonstrativos são gerados em torno dele       |
| `VITE_CITY_NAME`                             | Site          | Nome exibido da cidade de demonstração                                   |
| `VITE_DEMO_LATENCY_MS`                       | Site          | Espera simulada das operações, para mostrar os estados de carregamento   |
| `AI_PROVIDER`                                | Serviço da IA | Provedor. Hoje, apenas `anthropic`                                       |
| `ANTHROPIC_API_KEY`                          | Serviço da IA | Chave privada do provedor                                                |
| `AI_MODEL`                                   | Serviço da IA | Modelo usado (padrão: `claude-opus-5-5`)                                 |
| `AI_PORT`                                    | Serviço da IA | Porta do serviço (padrão: 8787)                                          |
| `AI_ALLOWED_ORIGIN`                          | Serviço da IA | Endereços de site autorizados, separados por vírgula                     |
| `AI_RATE_LIMIT_PER_MINUTE`                   | Serviço da IA | Pedidos por minuto aceitos de um mesmo endereço (padrão: 30)             |

Variáveis com prefixo `VITE_` são públicas: o valor fica embutido no site. **Nunca coloque chaves privadas nelas.** As variáveis `VITE_SUPABASE_*` do exemplo estão reservadas e ainda não são usadas.

## Modo demonstração

- **Dados no aparelho.** A base fica no IndexedDB do navegador e a sessão no armazenamento local. Limpar os dados do navegador apaga tudo.
- **Contas locais.** O cadastro cria a conta apenas naquele aparelho. As senhas são guardadas como derivação PBKDF2-SHA256 com sal, nunca em texto puro.
- **Simulações identificadas.** Atualizações institucionais levam o selo "Simulação"; notícias, instituições e planos trazem avisos de conteúdo demonstrativo; contatos fictícios não abrem ligações nem mensagens reais.
- **Restauração.** "Restaurar dados demonstrativos" devolve a base ao estado inicial depois de uma confirmação.

## Publicação no GitHub Pages

O site é 100% estático. O build usa caminho base relativo e rotas por hash, então funciona em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/` sem ajustes, e recarregar uma tela interna nunca gera erro 404.

1. Crie o repositório no GitHub e envie o código para a branch `main`. Em contas gratuitas, o GitHub Pages exige repositório público.
2. No repositório, abra **Settings → Pages** e, em **Build and deployment**, escolha **Source: GitHub Actions**.
3. A cada envio para `main`, o fluxo `.github/workflows/deploy.yml` gera e publica o site. Ele também pode ser disparado manualmente na aba **Actions**.
4. O endereço publicado aparece no resumo da execução e em **Settings → Pages**.

O mesmo fluxo roda a análise estática e os testes em um job separado, que não bloqueia a publicação: confira o resultado na aba **Actions**.

Para apontar o site publicado para o serviço da NEXA IA ou mudar o centro do mapa, cadastre as variáveis `VITE_*` em **Settings → Secrets and variables → Actions → Variables**.

Depois de uma nova publicação, quem já tinha aberto o site recebe a versão nova sem fazer nada: ao abrir, a página se atualiza sozinha em alguns segundos.

## NEXA IA: modos de funcionamento

A assistente funciona de duas formas, e a tela sempre informa qual está ativa.

**Modo demonstração (padrão).** As respostas são montadas no próprio aparelho, com regras que identificam a intenção da pergunta e consultam os dados do aplicativo (eventos, comércios, serviços, demandas e, para comerciantes, os números do próprio negócio). Nada é enviado para fora. O mesmo vale para as sugestões no registro de demandas e para as recomendações do NEXA Business, que são calculadas a partir dos registros e nunca inventam valores.

**Modo conectado (opcional).** Com `VITE_AI_API_URL` configurada, as perguntas vão para o serviço em `server/`, que conversa com o modelo de IA. A chave do provedor fica somente no servidor.

```bash
cp .env.example .env     # preencha ANTHROPIC_API_KEY
npm run ai:server        # http://localhost:8787
```

Depois, defina `VITE_AI_API_URL=http://localhost:8787` no `.env` e reinicie o `npm run dev`.

O serviço:

- aceita pedidos apenas dos endereços listados em `AI_ALLOWED_ORIGIN`;
- valida o tamanho e o formato da pergunta, do histórico e do contexto, e limita a frequência de pedidos;
- recebe do aplicativo somente dados públicos e agregados (resumo da comunidade, próximos eventos e comércios), além do primeiro nome e do perfil de quem pergunta;
- instrui o modelo a responder apenas com esses dados, a não afirmar que órgãos públicos receberam ou resolveram demandas e a orientar a busca por serviços oficiais em temas de saúde, direitos e emergências;
- não registra o conteúdo das conversas e não repassa ao navegador detalhes de falhas do provedor.

Se o serviço estiver fora do ar ou demorar, o aplicativo volta sozinho ao modo demonstração. No modo conectado, a tela avisa que as perguntas são enviadas a um serviço externo.

Como o GitHub Pages hospeda apenas arquivos estáticos, o serviço da IA precisa ficar em outra hospedagem, com HTTPS. Nesse caso, use `AI_ALLOWED_ORIGIN=https://SEU-USUARIO.github.io`.

## Arquitetura

```text
src/
  app/            rotas, guardas de acesso, layout e navegação
  components/     design system (ui), marca e ilustrações, mapa, gráficos e cartões de domínio
  features/       telas por módulo (auth, home, community, demands, map, businesses,
                  business-management, ai, institutions, events, notifications, profile, admin)
  repositories/   contratos e implementação local da camada de dados
  services/       regras de negócio: permissões, status de demandas, métricas e IA
  data/           base demonstrativa e conteúdos estáticos
  types/          modelo de dados
server/           serviço opcional da NEXA IA
e2e/              testes ponta a ponta
```

**Camada de repositórios.** As telas não sabem onde os dados moram: elas usam os contratos de `src/repositories/contracts.ts`. A implementação atual (`src/repositories/local`) guarda tudo no aparelho, com gravações transacionais e verificação de permissões. Trocar por um backend de verdade significa escrever outra implementação dos mesmos contratos, sem mexer na interface. As "tabelas" de `src/types/database.ts` já têm formato relacional para facilitar essa migração.

**Regras centralizadas.** Permissões por perfil ficam em `src/services/permissions.ts`, as transições de status em `src/services/demands/status.ts` e os cálculos do negócio em `src/services/business`. Valores em dinheiro são sempre inteiros, em centavos.

## Segurança, privacidade e acessibilidade

- Nenhuma chave privada no site. A chave da IA existe apenas no serviço em `server/`.
- Senhas nunca são guardadas em texto puro (PBKDF2-SHA256 com sal, pela Web Crypto do navegador).
- Permissões verificadas na camada de dados, e não apenas escondendo botões.
- Entradas validadas, com limites de tamanho. Imagens são reduzidas antes de serem guardadas.
- Localização do aparelho só com autorização, desligada por padrão e usada de forma aproximada. As demandas exibem "localização aproximada".
- Direitos previstos na LGPD ao alcance do usuário: aviso de privacidade, termos de uso, cópia dos próprios dados e exclusão da conta, em **Configurações**.
- Denúncia e moderação de conteúdo.
- Acessibilidade: navegação por teclado, rótulos para leitores de tela, foco tratado em janelas e menus, áreas de toque amplas e opção de reduzir animações. Não foi feita auditoria formal com leitores de tela.

## Testes

```bash
npm test                    # unitários e de integração
npx playwright install      # apenas na primeira vez: baixa os navegadores
npm run test:e2e            # ponta a ponta
```

- **Unitários e de integração (Vitest):** todos os repositórios, permissões, transições de status, métricas do negócio, vendas e estoque, consistência da base demonstrativa e o serviço da NEXA IA com um provedor simulado.
- **Ponta a ponta (Playwright):** os seis fluxos principais (demanda, comunidade, comércio, gestão do negócio, NEXA IA e evento), permissões, atualização institucional com notificação, moderação, restauração da base, cadastro e login, acesso por QR Code e troca de perfil por link. Rodam em celular simulado com Chromium e com WebKit (motor do Safari), além de verificações de layout em desktop.

## Limitações conhecidas

- **Sem servidor de dados.** Os dados não são compartilhados entre aparelhos nem entre pessoas, e as verificações de permissão rodam no navegador. Em produção, elas precisam ser repetidas no servidor.
- **Integrações oficiais inexistentes.** Não há ligação com prefeituras ou órgãos públicos, e as atualizações institucionais são simuladas.
- **Sem pagamentos** e sem preços definidos para os planos pagos.
- **NEXA IA.** O modo demonstração usa regras e responde a um conjunto limitado de assuntos. O serviço do modo conectado foi testado com um provedor simulado, mas não foi exercitado contra a API real neste repositório.
- **Recuperação de senha simulada** e notificações apenas dentro do aplicativo (sem push, e-mail ou SMS).
- **Mapa depende de internet.** Os blocos do mapa vêm dos servidores públicos do OpenStreetMap, adequados para demonstração, mas não para uso intenso. Não há busca de endereços: o local é marcado no mapa.
- **Armazenamento local.** Fotos ficam no aparelho e estão sujeitas ao limite de espaço do navegador.
- **Compatibilidade.** Testado de forma automatizada em Chromium e WebKit. Não houve bateria de testes em aparelhos físicos.
- **Limite de pedidos da IA em memória.** Atrás de um proxy, o limite vale para todos os usuários juntos.

## Próximos passos

1. Backend com banco de dados e autenticação (por exemplo, Supabase), implementando os contratos de `src/repositories/contracts.ts` com regras de acesso no servidor. O esquema SQL ainda não foi escrito.
2. Publicar o serviço da NEXA IA e validar o modo conectado com usuários reais.
3. Integração com canais oficiais de atendimento (ouvidorias, protocolos municipais) e verificação de instituições.
4. Notificações push e por e-mail.
5. Busca de endereços e provedor próprio de mapas.
6. Auditoria de acessibilidade e testes em aparelhos físicos.
7. Definição de preços e meio de pagamento para os planos.

## Créditos

- Dados e blocos de mapa: © colaboradores do [OpenStreetMap](https://www.openstreetmap.org/copyright).
- Ícones [Lucide](https://lucide.dev) e fonte Plus Jakarta Sans.
- As ilustrações e o logotipo foram desenhados em SVG para este projeto.
