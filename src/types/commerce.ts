import type { Cents, GeoPoint, ID, ISODate, IllustrationKey } from './common'
import type { Category } from './demands'
import type { PublicProfile } from './user'

/** Horário de um dia no formato "HH:mm" (24h). */
export interface DayHours {
  open: string
  close: string
}

/**
 * Horário semanal de funcionamento. Índice 0 = domingo … 6 = sábado.
 * `null` = fechado no dia.
 */
export type WeekSchedule = [
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
]

export const WEEKDAY_LABEL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

/** Configurações privadas do estabelecimento (visíveis apenas ao proprietário). */
export interface BusinessSettings {
  /**
   * Quando `true`, permite registrar vendas acima do estoque disponível
   * (o estoque fica negativo). Padrão: `false`.
   */
  allowNegativeStock: boolean
}

/** Estabelecimento do catálogo de comércio local. */
export interface Business {
  id: ID
  ownerId: ID
  name: string
  categoryId: ID
  description: string
  /** Ilustração de capa (biblioteca NEXA). */
  illustration?: IllustrationKey
  /** Imagem de capa enviada pelo proprietário (data URL). Tem precedência sobre a ilustração. */
  coverUrl?: string
  /** Outras imagens enviadas (data URLs). */
  gallery: string[]
  address: string
  neighborhoodId: ID
  location: GeoPoint
  phone: string
  whatsapp?: string
  email?: string
  instagram?: string
  schedule: WeekSchedule
  /** Destaques/serviços oferecidos (ex.: "Entrega", "Aceita Pix"). */
  tags: string[]
  settings: BusinessSettings
  /**
   * Registro fictício da base demonstrativa. Os contatos de registros demonstrativos
   * NUNCA viram links reais (telefone, WhatsApp, redes) — ver `utils/contact.ts`.
   */
  isDemo: boolean
  status: 'active' | 'inactive'
  createdAt: ISODate
  updatedAt: ISODate
}

/** Avaliação de um estabelecimento (uma por usuário). */
export interface Review {
  id: ID
  businessId: ID
  authorId: ID
  /** Nota de 1 a 5. */
  rating: number
  comment: string
  createdAt: ISODate
}

/** Estabelecimento favoritado por um usuário. */
export interface Favorite {
  userId: ID
  businessId: ID
  createdAt: ISODate
}

export type ProductUnit = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'pct' | 'cx' | 'dz' | 'h'

export const PRODUCT_UNIT_LABEL: Record<ProductUnit, string> = {
  un: 'unidade',
  kg: 'quilo',
  g: 'grama',
  l: 'litro',
  ml: 'mililitro',
  pct: 'pacote',
  cx: 'caixa',
  dz: 'dúzia',
  h: 'hora',
}

/** Produto ou serviço de um estabelecimento. */
export interface Product {
  id: ID
  businessId: ID
  name: string
  description?: string
  /** Agrupamento livre definido pelo comerciante (ex.: "Pães", "Bebidas"). */
  group?: string
  priceCents: Cents
  /** Custo unitário (opcional), usado para estimar margem. */
  costCents?: Cents
  /** `false` para serviços e itens sem controle de estoque. */
  trackStock: boolean
  stock: number
  /** Abaixo ou igual a este valor o item é considerado com estoque baixo. */
  minStock: number
  unit: ProductUnit
  /** Aparece na página pública do estabelecimento. */
  showInCatalog: boolean
  active: boolean
  createdAt: ISODate
  updatedAt: ISODate
}

export type PaymentMethod = 'pix' | 'cash' | 'debit_card' | 'credit_card' | 'other'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit_card: 'Cartão de débito',
  credit_card: 'Cartão de crédito',
  other: 'Outro',
}

/** Item de uma venda. Nome e preço são "fotografados" no momento da venda. */
export interface SaleItem {
  productId: ID
  productName: string
  quantity: number
  unitPriceCents: Cents
  subtotalCents: Cents
}

/** Venda registrada no NEXA Business. */
export interface Sale {
  id: ID
  businessId: ID
  items: SaleItem[]
  /** Soma dos itens antes do desconto. */
  subtotalCents: Cents
  discountCents: Cents
  /** Total cobrado (subtotal − desconto). */
  totalCents: Cents
  paymentMethod: PaymentMethod
  note?: string
  createdBy: ID
  /** Momento da venda. */
  soldAt: ISODate
  createdAt: ISODate
}

export type TransactionType = 'income' | 'expense'

export type TransactionCategory =
  // receitas
  | 'sales'
  | 'services'
  | 'other_income'
  // despesas
  | 'suppliers'
  | 'rent'
  | 'utilities'
  | 'payroll'
  | 'taxes'
  | 'marketing'
  | 'maintenance'
  | 'other_expense'

export const TRANSACTION_CATEGORY_LABEL: Record<TransactionCategory, string> = {
  sales: 'Vendas',
  services: 'Serviços prestados',
  other_income: 'Outras receitas',
  suppliers: 'Fornecedores',
  rent: 'Aluguel',
  utilities: 'Água, luz e internet',
  payroll: 'Folha de pagamento',
  taxes: 'Impostos e taxas',
  marketing: 'Divulgação',
  maintenance: 'Manutenção',
  other_expense: 'Outras despesas',
}

export const INCOME_CATEGORIES: TransactionCategory[] = ['sales', 'services', 'other_income']
export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'suppliers',
  'rent',
  'utilities',
  'payroll',
  'taxes',
  'marketing',
  'maintenance',
  'other_expense',
]

/** Lançamento financeiro (receita ou despesa) de um estabelecimento. */
export interface Transaction {
  id: ID
  businessId: ID
  type: TransactionType
  category: TransactionCategory
  description: string
  /** Sempre positivo; o sinal vem de `type`. */
  amountCents: Cents
  /** Data de competência do lançamento. */
  date: ISODate
  /** Preenchido quando o lançamento foi gerado automaticamente por uma venda. */
  saleId?: ID
  createdBy: ID
  createdAt: ISODate
}

// ── Modelos de visualização ──

/**
 * Item do catálogo PÚBLICO de um estabelecimento.
 * Não expõe custo nem quantidade em estoque (dados privados do comerciante).
 */
export interface CatalogItem {
  id: ID
  businessId: ID
  name: string
  description?: string
  group?: string
  priceCents: Cents
  unit: ProductUnit
  /** Disponível para venda (sem controle de estoque ou com estoque positivo). */
  available: boolean
}

export interface BusinessView extends Omit<Business, 'settings'> {
  /** Configurações privadas — presentes apenas quando o estabelecimento é do usuário atual. */
  settings?: BusinessSettings
  category: Category
  neighborhoodName: string
  /** Média das avaliações (1 casa decimal) ou `null` quando ainda não há avaliações. */
  rating: number | null
  reviewCount: number
  isOpenNow: boolean
  /** Horário de hoje, ou `null` se fechado hoje. */
  todayHours: DayHours | null
  /** Distância aproximada até o ponto de referência do usuário, em metros. */
  distanceMeters: number | null
  isFavorite: boolean
  isMine: boolean
}

export interface ReviewView extends Review {
  author: PublicProfile
  isMine: boolean
}
