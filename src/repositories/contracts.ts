/**
 * CONTRATOS DA CAMADA DE DADOS DO NEXA
 * ─────────────────────────────────────────────────────────────────────────────
 * A interface do aplicativo conversa SOMENTE com estes contratos (via `repos`,
 * exportado em `src/repositories/index.ts`). Hoje existe a implementação local
 * (`src/repositories/local`), com persistência no navegador; uma implementação
 * Supabase pode substituí-la sem alterar telas, hooks ou componentes.
 *
 * Convenções válidas para TODOS os métodos:
 *  • São assíncronos e devolvem cópias independentes dos dados (nunca referências
 *    internas do armazenamento).
 *  • O usuário atual vem da sessão (como no Supabase Auth) — nunca é passado por
 *    parâmetro. Permissões são verificadas aqui, não apenas na interface.
 *  • Falhas esperadas são lançadas como `AppError` (`src/utils/errors.ts`):
 *      - `validation`      dados inválidos (com `fieldErrors` quando fizer sentido)
 *      - `unauthenticated` é preciso entrar na conta
 *      - `forbidden`       o perfil não tem permissão
 *      - `not_found`       registro inexistente
 *      - `conflict`        regra de negócio impede a ação
 *      - `insufficient_stock` venda acima do estoque disponível
 *  • Textos são validados e normalizados (trim) antes de gravar.
 *  • Datas são ISO 8601; valores monetários são inteiros em centavos.
 */

import type {
  AIMessage,
  AdminOverview,
  AppNotification,
  AvatarSpec,
  Business,
  BusinessSettings,
  BusinessView,
  CatalogItem,
  Category,
  CategoryKind,
  Cents,
  ColorKey,
  CommentView,
  CommunitySummary,
  DateRange,
  DemandAISuggestion,
  DemandStatus,
  DemandView,
  EventView,
  GeoPoint,
  ID,
  ISODate,
  IconKey,
  IllustrationKey,
  InitiativeView,
  Institution,
  InstitutionCategory,
  InstitutionPanelSummary,
  InstitutionView,
  MapLayer,
  MapPoint,
  ModerationStatus,
  Neighborhood,
  NewsArticle,
  NotificationCategory,
  PaymentMethod,
  PostCategory,
  PostView,
  Product,
  ProductUnit,
  PublicProfile,
  PublicServiceKind,
  PublicServiceView,
  ReportReason,
  ReportStatus,
  ReportView,
  ReviewView,
  Sale,
  Transaction,
  TransactionCategory,
  TransactionType,
  Urgency,
  User,
  UserRole,
  UserSettings,
  UserStatus,
  WeekSchedule,
} from '@/types'

// ═════════════════════════════════════════════════════════════════════════════
// Autenticação e conta
// ═════════════════════════════════════════════════════════════════════════════

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  /** Perfil escolhido no cadastro. Contas de administração não são criadas pelo app. */
  role: Exclude<UserRole, 'admin'>
  neighborhoodId: ID
  /** Obrigatório quando `role === 'institution'`. */
  institution?: { name: string; category: InstitutionCategory }
  /** Aceite dos termos de uso e do aviso de privacidade — precisa ser `true`. */
  acceptedTerms: boolean
}

export interface ProfileUpdateInput {
  name?: string
  /** Sem "@"; 3 a 24 caracteres: letras minúsculas, números, "_" e "."; começa e termina com letra ou número; único. */
  username?: string
  bio?: string
  neighborhoodId?: ID
  avatar?: AvatarSpec
  /** Data URL da nova foto, ou `null` para remover a foto e voltar ao avatar ilustrado. */
  photoUrl?: string | null
}

export interface PasswordResetRequest {
  /** Sempre `true` no modo demonstração: nenhum e-mail é realmente enviado. */
  simulated: boolean
  /**
   * Token de redefinição. Em produção ele seguiria por e-mail; no modo demonstração é
   * devolvido para que a interface simule o "link recebido". `null` quando não há conta
   * com o e-mail informado (a interface deve exibir a mesma mensagem neutra nos dois casos).
   */
  resetToken: string | null
}

/** Cópia dos dados pessoais do usuário (portabilidade — LGPD). */
export interface PersonalDataExport {
  exportedAt: ISODate
  notice: string
  account: User
  settings: UserSettings
  posts: unknown[]
  comments: unknown[]
  demands: unknown[]
  supportedDemandIds: ID[]
  reviews: unknown[]
  favoriteBusinessIds: ID[]
  attendingEventIds: ID[]
  notifications: unknown[]
  business?: unknown
  aiMessages: unknown[]
}

export interface AuthRepository {
  /** Usuário da sessão atual, ou `null`. Contas suspensas/excluídas encerram a sessão. */
  getCurrentUser(): Promise<User | null>
  /** Erro genérico ("E-mail ou senha incorretos.") para não revelar quais e-mails existem. */
  signIn(input: SignInInput): Promise<User>
  /** Acesso rápido a uma conta demonstrativa do perfil indicado. Só existe no modo demonstração. */
  signInDemo(role: UserRole): Promise<User>
  /** Cria a conta, as preferências padrão e inicia a sessão. E-mail deve ser único. */
  signUp(input: SignUpInput): Promise<User>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<PasswordResetRequest>
  /** Define nova senha a partir de um token válido e não expirado (uso único). */
  resetPassword(token: string, newPassword: string): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  updateProfile(patch: ProfileUpdateInput): Promise<User>
  /**
   * Converte uma conta de Morador em Comerciante (para cadastrar um estabelecimento).
   * Contas demonstrativas não podem ser convertidas (`conflict`) — existe um perfil
   * demonstrativo próprio de comerciante.
   */
  becomeMerchant(): Promise<User>
  exportMyData(): Promise<PersonalDataExport>
  /**
   * Exclui a conta e os dados pessoais. Conteúdos públicos do usuário (publicações,
   * comentários, avaliações) são removidos; demandas são mantidas de forma anonimizada.
   * Contas demonstrativas não podem ser excluídas (`conflict`).
   */
  deleteMyAccount(): Promise<void>
}

// ═════════════════════════════════════════════════════════════════════════════
// Usuários, bairros e categorias
// ═════════════════════════════════════════════════════════════════════════════

export interface UsersRepository {
  getPublicProfile(id: ID): Promise<PublicProfile | null>
  /** Somente administração. */
  listAll(filters?: { role?: UserRole | 'all'; search?: string }): Promise<User[]>
  /**
   * Somente administração. Não é possível suspender a si mesmo, outras contas de
   * administração nem contas demonstrativas (`conflict`).
   */
  setStatus(id: ID, status: UserStatus): Promise<User>
}

export interface CategoryInput {
  kind: CategoryKind
  name: string
  description?: string
  icon: IconKey
  color: ColorKey
  /** Somente categorias de demanda. */
  defaultInstitutionId?: ID | null
}

export interface ReferenceRepository {
  listNeighborhoods(): Promise<Neighborhood[]>
  /** Por padrão devolve apenas categorias ativas, ordenadas por `order`. */
  listCategories(kind: CategoryKind, options?: { includeInactive?: boolean }): Promise<Category[]>
  /** Somente administração. Nome único dentro do mesmo `kind`. */
  createCategory(input: CategoryInput): Promise<Category>
  /** Somente administração. */
  updateCategory(
    id: ID,
    patch: Partial<Omit<CategoryInput, 'kind'>> & { active?: boolean },
  ): Promise<Category>
  /**
   * Somente administração. Categorias de sistema ou em uso não podem ser excluídas
   * (`conflict`) — nesses casos a orientação é desativar.
   */
  deleteCategory(id: ID): Promise<void>
}

// ═════════════════════════════════════════════════════════════════════════════
// Comunidade (feed) e moderação
// ═════════════════════════════════════════════════════════════════════════════

export interface PostFilters {
  category?: PostCategory | 'all'
  search?: string
  authorId?: ID
  neighborhoodId?: ID
  /** Somente administração: inclui publicações ocultadas pela moderação. */
  includeHidden?: boolean
}

export interface CreatePostInput {
  content: string
  category: PostCategory
  /** Data URL já comprimida (ver `processImageFile`). */
  imageUrl?: string
  linkedDemandId?: ID
  linkedEventId?: ID
  /**
   * Em nome de quem publicar. `institution` exige conta institucional;
   * `business` exige comerciante com estabelecimento. Padrão: `self`.
   */
  publishAs?: 'self' | 'institution' | 'business'
}

export interface PostsRepository {
  /**
   * Mais recentes primeiro. Publicações ocultadas não aparecem, exceto para a administração
   * (`includeHidden`) e para o próprio autor quando filtra por `authorId` igual ao seu.
   */
  list(filters?: PostFilters): Promise<PostView[]>
  /** Publicação ocultada pela moderação: `null`, exceto para o autor e a administração. */
  get(id: ID): Promise<PostView | null>
  /** Publicar em nome de instituição exige que ela esteja VERIFICADA pela administração. */
  create(input: CreatePostInput): Promise<PostView>
  /** Autor ou administração. Remove também comentários e denúncias da publicação. */
  remove(id: ID): Promise<void>
  /** Curte/descurte. */
  toggleLike(id: ID): Promise<PostView>
  /** Mais antigos primeiro. */
  listComments(postId: ID): Promise<CommentView[]>
  /** Notifica o autor da publicação (quando não for o próprio). */
  addComment(postId: ID, content: string): Promise<CommentView>
  /** Autor do comentário ou administração. */
  removeComment(commentId: ID): Promise<void>
  /** Denuncia uma publicação ou comentário para revisão. Uma denúncia aberta por usuário/conteúdo. */
  report(
    target: { type: 'post' | 'comment'; id: ID },
    reason: ReportReason,
    details?: string,
  ): Promise<void>
}

/** Somente administração. */
export interface ModerationRepository {
  listReports(filters?: { status?: ReportStatus | 'all' }): Promise<ReportView[]>
  /**
   * `dismiss` mantém o conteúdo; `hide` oculta; `remove` exclui.
   * `hide`/`remove` notificam o autor e encerram as demais denúncias abertas do mesmo conteúdo.
   */
  resolveReport(id: ID, action: 'dismiss' | 'hide' | 'remove'): Promise<void>
  setPostModeration(postId: ID, moderation: ModerationStatus): Promise<PostView>
  setCommentModeration(commentId: ID, moderation: ModerationStatus): Promise<void>
}

// ═════════════════════════════════════════════════════════════════════════════
// Demandas comunitárias
// ═════════════════════════════════════════════════════════════════════════════

export interface DemandFilters {
  /** `open` = registrada, em análise ou em andamento. Padrão: `all`. */
  status?: DemandStatus | 'open' | 'all'
  categoryId?: ID
  search?: string
  authorId?: ID
  /** Demandas apoiadas pelo usuário indicado. */
  supportedBy?: ID
  institutionId?: ID
  neighborhoodId?: ID
  /** `recent` (padrão), `supported` (mais apoiadas) ou `urgent` (maior urgência). */
  sort?: 'recent' | 'supported' | 'urgent'
}

export interface CreateDemandInput {
  categoryId: ID
  title: string
  description: string
  /** Até 3 data URLs já comprimidas. */
  photos?: string[]
  /**
   * Local aproximado do problema, ou `null` se não informado. Precisa estar dentro da
   * área de demonstração; o repositório reduz a precisão (4 casas decimais) ao gravar.
   */
  location: GeoPoint | null
  addressHint?: string
  /** Quando ausente, usa o bairro mais próximo do local ou o bairro do autor. */
  neighborhoodId?: ID
  urgency: Urgency
  /** Sugestões da NEXA IA exibidas no formulário (guardadas apenas para transparência). */
  aiSuggestion?: DemandAISuggestion
  /** Publica a demanda também no feed da comunidade. Padrão: `true`. */
  shareOnFeed?: boolean
}

export interface DemandsRepository {
  list(filters?: DemandFilters): Promise<DemandView[]>
  get(id: ID): Promise<DemandView | null>
  /**
   * Registra a demanda com status `registered`, gera o protocolo (NX-AAAA-NNNN),
   * indica a instituição padrão da categoria como possível responsável (encaminhamento
   * demonstrativo), cria o histórico inicial e, se `shareOnFeed`, a publicação no feed.
   */
  create(input: CreateDemandInput): Promise<DemandView>
  /** Apoia/retira o apoio. O autor não pode apoiar a própria demanda (`conflict`). */
  toggleSupport(id: ID): Promise<DemandView>
  /**
   * Altera o status.
   *  • Instituição responsável e administração: transições permitidas em
   *    `src/services/demands/status.ts`, com mensagem obrigatória.
   *  • Autor: pode apenas encerrar (`closed`) a própria demanda enquanto estiver em aberto.
   * Registra a entrada no histórico (marcada como `simulated` no modo demonstração quando
   * feita por instituição/administração) e notifica autor e apoiadores.
   */
  updateStatus(id: ID, input: { status: DemandStatus; message?: string }): Promise<DemandView>
  /** Publica uma atualização no histórico sem mudar o status (instituição responsável ou administração). */
  postUpdate(id: ID, message: string): Promise<DemandView>
  /** Somente administração: define/remove a instituição responsável. */
  assignInstitution(id: ID, institutionId: ID | null): Promise<DemandView>
  /** Mais antigos primeiro. */
  listComments(demandId: ID): Promise<CommentView[]>
  addComment(demandId: ID, content: string): Promise<CommentView>
  /** Autor do comentário ou administração. */
  removeComment(commentId: ID): Promise<void>
  /** Somente administração. Remove também comentários e a publicação vinculada. */
  remove(id: ID): Promise<void>
}

// ═════════════════════════════════════════════════════════════════════════════
// Comércio local
// ═════════════════════════════════════════════════════════════════════════════

export interface BusinessFilters {
  categoryId?: ID
  search?: string
  onlyFavorites?: boolean
  onlyOpenNow?: boolean
  /** Ponto de referência para distâncias. Padrão: centro aproximado do bairro do usuário. */
  near?: GeoPoint
  /** `distance` (padrão), `rating` ou `name`. */
  sort?: 'distance' | 'rating' | 'name'
}

export interface BusinessInput {
  name: string
  categoryId: ID
  description: string
  illustration?: IllustrationKey
  /** Data URL da capa, ou `null` para remover. */
  coverUrl?: string | null
  gallery?: string[]
  address: string
  neighborhoodId: ID
  location: GeoPoint
  phone: string
  whatsapp?: string
  email?: string
  instagram?: string
  schedule: WeekSchedule
  tags?: string[]
  settings?: Partial<BusinessSettings>
  status?: Business['status']
}

export interface BusinessesRepository {
  /** Somente estabelecimentos ativos. */
  list(filters?: BusinessFilters): Promise<BusinessView[]>
  get(id: ID, options?: { near?: GeoPoint }): Promise<BusinessView | null>
  /** Estabelecimento do comerciante atual, ou `null`. */
  getMine(): Promise<BusinessView | null>
  /** Comerciante que ainda não possui estabelecimento. Vincula o negócio à conta. */
  create(input: BusinessInput): Promise<BusinessView>
  /** Proprietário ou administração. */
  update(id: ID, patch: Partial<BusinessInput>): Promise<BusinessView>
  toggleFavorite(id: ID): Promise<BusinessView>
  /** Mais recentes primeiro. */
  listReviews(businessId: ID): Promise<ReviewView[]>
  /**
   * Registra (ou atualiza) a avaliação do usuário atual — uma por estabelecimento.
   * O proprietário não pode avaliar o próprio negócio. Notifica o proprietário.
   */
  saveReview(businessId: ID, input: { rating: number; comment: string }): Promise<ReviewView>
  /** Autor da avaliação ou administração. */
  removeReview(reviewId: ID): Promise<void>
  /** Itens públicos do estabelecimento (`showInCatalog` e `active`), sem custo nem estoque. */
  listCatalog(businessId: ID): Promise<CatalogItem[]>
}

// ═════════════════════════════════════════════════════════════════════════════
// NEXA Business — gestão (dados privados do proprietário do estabelecimento)
// ═════════════════════════════════════════════════════════════════════════════

export interface ProductInput {
  name: string
  description?: string
  group?: string
  priceCents: Cents
  costCents?: Cents | null
  trackStock: boolean
  stock: number
  minStock: number
  unit: ProductUnit
  showInCatalog: boolean
  active: boolean
}

export interface ProductsRepository {
  /** Somente o proprietário. Ordenado por nome. */
  list(
    businessId: ID,
    options?: { search?: string; onlyLowStock?: boolean; includeInactive?: boolean },
  ): Promise<Product[]>
  get(id: ID): Promise<Product | null>
  create(businessId: ID, input: ProductInput): Promise<Product>
  update(id: ID, patch: Partial<ProductInput>): Promise<Product>
  /** Produtos com vendas registradas são apenas desativados (preserva o histórico). */
  remove(id: ID): Promise<void>
  /** Entrada (positivo) ou saída (negativo) manual de estoque. */
  adjustStock(id: ID, delta: number): Promise<Product>
}

export interface RegisterSaleInput {
  items: Array<{ productId: ID; quantity: number }>
  paymentMethod: PaymentMethod
  discountCents?: Cents
  note?: string
  /** Momento da venda. Padrão: agora. Não pode estar no futuro. */
  soldAt?: ISODate
}

export interface SalesRepository {
  /** Somente o proprietário. Mais recentes primeiro. */
  list(businessId: ID, filters?: { range?: DateRange }): Promise<Sale[]>
  get(id: ID): Promise<Sale | null>
  /**
   * Registra a venda de forma atômica:
   *  1. valida itens e quantidades (itens repetidos são somados);
   *  2. confere o estoque — sem `settings.allowNegativeStock`, quantidade acima do
   *     disponível gera `insufficient_stock` e NADA é gravado;
   *  3. calcula subtotal, desconto e total;
   *  4. baixa o estoque dos produtos com `trackStock`;
   *  5. cria o lançamento de receita vinculado (`category: 'sales'`, `saleId`);
   *  6. notifica o proprietário quando algum item atinge o estoque mínimo.
   */
  register(businessId: ID, input: RegisterSaleInput): Promise<Sale>
}

export interface TransactionInput {
  type: TransactionType
  /** Precisa ser compatível com `type` (ver INCOME_CATEGORIES / EXPENSE_CATEGORIES). */
  category: TransactionCategory
  description: string
  /** Maior que zero. */
  amountCents: Cents
  date: ISODate
}

export interface TransactionFilters {
  range?: DateRange
  type?: TransactionType
  category?: TransactionCategory
}

export interface TransactionsRepository {
  /** Somente o proprietário. Mais recentes primeiro (por `date`). */
  list(businessId: ID, filters?: TransactionFilters): Promise<Transaction[]>
  create(businessId: ID, input: TransactionInput): Promise<Transaction>
  /** Lançamentos gerados por vendas não podem ser removidos (`conflict`). */
  remove(id: ID): Promise<void>
}

// ═════════════════════════════════════════════════════════════════════════════
// Instituições, iniciativas e serviços públicos
// ═════════════════════════════════════════════════════════════════════════════

export interface InstitutionFilters {
  category?: InstitutionCategory | 'all'
  search?: string
  /** Somente administração: inclui instituições ainda não verificadas. */
  includeUnverified?: boolean
}

export interface InstitutionUpdateInput {
  tagline?: string
  description?: string
  areas?: string[]
  services?: string[]
  phone?: string
  email?: string
  website?: string
  address?: string
}

export interface InitiativeInput {
  title: string
  description: string
  illustration?: IllustrationKey
  imageUrl?: string
  /** Publica a iniciativa também no feed (categoria "Iniciativas sociais"). Padrão: `true`. */
  shareOnFeed?: boolean
}

export interface InstitutionsRepository {
  /** Diretório público: somente instituições verificadas. */
  list(filters?: InstitutionFilters): Promise<InstitutionView[]>
  get(id: ID): Promise<InstitutionView | null>
  /** Instituição representada pela conta atual, ou `null`. */
  getMine(): Promise<InstitutionView | null>
  /** Conta da própria instituição ou administração. */
  update(id: ID, patch: InstitutionUpdateInput): Promise<InstitutionView>
  /** Somente administração. */
  setVerified(id: ID, verified: boolean): Promise<InstitutionView>
  /** Mais recentes primeiro. */
  listInitiatives(filters?: { institutionId?: ID }): Promise<InitiativeView[]>
  /** Conta institucional. */
  publishInitiative(input: InitiativeInput): Promise<InitiativeView>
  /** Conta da instituição autora ou administração. */
  updateInitiative(
    id: ID,
    patch: Partial<Pick<InitiativeInput, 'title' | 'description'>> & {
      status?: 'active' | 'finished'
    },
  ): Promise<InitiativeView>
  removeInitiative(id: ID): Promise<void>
  /** Indicadores das demandas encaminhadas à instituição da conta atual (ou de `institutionId`, para a administração). */
  getPanelSummary(institutionId?: ID): Promise<InstitutionPanelSummary>
  listServices(filters?: {
    kind?: PublicServiceKind | 'all'
    search?: string
    institutionId?: ID
    near?: GeoPoint
  }): Promise<PublicServiceView[]>
  getService(id: ID): Promise<PublicServiceView | null>
}

// ═════════════════════════════════════════════════════════════════════════════
// Eventos
// ═════════════════════════════════════════════════════════════════════════════

export interface EventFilters {
  /** `upcoming` (padrão) = ainda não terminou; `past` = já realizado. */
  when?: 'upcoming' | 'past' | 'all'
  categoryId?: ID
  search?: string
  /** Eventos com presença confirmada pelo usuário indicado. */
  attendeeId?: ID
  /** Eventos criados pelo usuário indicado. */
  createdBy?: ID
  includeCancelled?: boolean
}

export interface EventInput {
  title: string
  description: string
  categoryId: ID
  illustration?: IllustrationKey
  /** Data URL da capa, ou `null` para remover. */
  imageUrl?: string | null
  startsAt: ISODate
  endsAt: ISODate
  venue: string
  address?: string
  neighborhoodId: ID
  location?: GeoPoint | null
  /** Limite de vagas, ou `null` para ilimitado. */
  capacity?: number | null
  /** Em nome de quem organizar. Padrão: `self`. */
  organizerAs?: 'self' | 'institution' | 'business'
  /** Publica o evento também no feed. Padrão: `true`. */
  shareOnFeed?: boolean
}

export interface EventsRepository {
  /** Próximos: mais cedo primeiro. Realizados: mais recentes primeiro. */
  list(filters?: EventFilters): Promise<EventView[]>
  get(id: ID): Promise<EventView | null>
  /** Qualquer usuário autenticado. O término deve ser depois do início, e o início no futuro. */
  create(input: EventInput): Promise<EventView>
  /** Criador ou administração. */
  update(id: ID, patch: Partial<EventInput>): Promise<EventView>
  /** Criador ou administração. Notifica quem confirmou presença. */
  cancel(id: ID): Promise<EventView>
  /** Somente administração. Remove também a publicação vinculada. */
  remove(id: ID): Promise<void>
  /**
   * Confirma ou cancela a presença do usuário atual e devolve o evento com a contagem
   * atualizada. Eventos cancelados ou já realizados não aceitam alterações (`conflict`).
   * Evento lotado impede apenas NOVAS confirmações: quem já confirmou sempre pode cancelar.
   */
  toggleAttendance(id: ID): Promise<EventView>
}

// ═════════════════════════════════════════════════════════════════════════════
// Notificações, notícias, indicadores e mapa
// ═════════════════════════════════════════════════════════════════════════════

export interface NotificationsRepository {
  /** Notificações do usuário atual, mais recentes primeiro. */
  list(filters?: {
    category?: NotificationCategory | 'all'
    unreadOnly?: boolean
  }): Promise<AppNotification[]>
  unreadCount(): Promise<number>
  markRead(id: ID, read?: boolean): Promise<void>
  markAllRead(category?: NotificationCategory): Promise<void>
  remove(id: ID): Promise<void>
}

export interface NewsRepository {
  /** Mais recentes primeiro. */
  list(options?: { limit?: number }): Promise<NewsArticle[]>
  get(id: ID): Promise<NewsArticle | null>
}

export interface StatsRepository {
  /** Indicadores públicos da tela inicial, calculados a partir dos dados do sistema. */
  getCommunitySummary(): Promise<CommunitySummary>
  /** Somente administração. */
  getAdminOverview(): Promise<AdminOverview>
}

export interface MapRepository {
  /**
   * Pontos do mapa inteligente, gerados a partir das entidades com coordenadas:
   * demandas (exceto encerradas), estabelecimentos ativos, instituições verificadas,
   * eventos futuros e serviços públicos. Sem `layers`, devolve todas as camadas.
   */
  listPoints(filters?: { layers?: MapLayer[] }): Promise<MapPoint[]>
}

// ═════════════════════════════════════════════════════════════════════════════
// NEXA IA (histórico), preferências e sistema
// ═════════════════════════════════════════════════════════════════════════════

export interface AIConversationsRepository {
  /** Histórico de mensagens do usuário atual com a NEXA IA. */
  getMessages(): Promise<AIMessage[]>
  /** Acrescenta mensagens ao histórico (mantém no máximo as 200 mais recentes). */
  appendMessages(messages: AIMessage[]): Promise<void>
  clear(): Promise<void>
}

export interface SettingsRepository {
  get(): Promise<UserSettings>
  update(
    patch: Partial<Pick<UserSettings, 'locationConsent' | 'motion'>> & {
      notifications?: Partial<UserSettings['notifications']>
    },
  ): Promise<UserSettings>
}

export interface SystemInfo {
  isDemoMode: boolean
  /** Onde os dados estão sendo guardados neste dispositivo. */
  storage: 'indexeddb' | 'memory'
  /** Quando a base demonstrativa atual foi gerada. */
  seededAt: ISODate
}

export interface SystemRepository {
  getInfo(): Promise<SystemInfo>
  /**
   * Restaura todos os dados demonstrativos para o estado inicial (com datas recalculadas
   * a partir de agora) e encerra a sessão atual. Disponível sem autenticação, pois os
   * dados pertencem apenas a este dispositivo.
   */
  resetDemoData(): Promise<void>
}

// ═════════════════════════════════════════════════════════════════════════════
// Conjunto completo
// ═════════════════════════════════════════════════════════════════════════════

export interface Repositories {
  auth: AuthRepository
  users: UsersRepository
  reference: ReferenceRepository
  posts: PostsRepository
  moderation: ModerationRepository
  demands: DemandsRepository
  businesses: BusinessesRepository
  products: ProductsRepository
  sales: SalesRepository
  transactions: TransactionsRepository
  institutions: InstitutionsRepository
  events: EventsRepository
  notifications: NotificationsRepository
  news: NewsRepository
  stats: StatsRepository
  map: MapRepository
  aiConversations: AIConversationsRepository
  settings: SettingsRepository
  system: SystemRepository
}

/** Reexportado por conveniência para quem implementa os repositórios. */
export type { Institution }
