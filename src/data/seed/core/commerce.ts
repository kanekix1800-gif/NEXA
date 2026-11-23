import type { Cents, Favorite, Product, ProductUnit, Review } from '@/types'

import { BUSINESSES, RESIDENTS, type BusinessKey } from '../cast'
import type { SeedContext } from '../context'

type ResidentKey = keyof typeof RESIDENTS

// ── Avaliações ───────────────────────────────────────────────────────────────

/** [estabelecimento, autor, nota, comentário, dias atrás, hora] */
type ReviewRow = readonly [BusinessKey, ResidentKey, number, string, number, number]

const REVIEW_ROWS: readonly ReviewRow[] = [
  // Padaria do Bairro — 9 avaliações (média 4,8). O Antonio ainda não avaliou: será feito ao vivo.
  [
    'padaria',
    'maria',
    5,
    'O pão francês é o melhor da região, sempre quentinho de manhã. A Carla atende todo mundo com um sorriso.',
    82,
    8,
  ],
  [
    'padaria',
    'joao',
    5,
    'Passo todo dia antes do trabalho. Café coado na hora e pão de queijo perfeito.',
    74,
    7,
  ],
  [
    'padaria',
    'ana',
    4,
    'Muito boa! Só às vezes o bolo de cenoura acaba cedo no fim de semana.',
    66,
    10,
  ],
  [
    'padaria',
    'pedro',
    5,
    'Encomendei uma torta de frango para o aniversário da minha filha e foi sucesso total.',
    58,
    18,
  ],
  ['padaria', 'juliana', 5, 'Ambiente limpo, preço justo e atendimento rápido. Recomendo.', 47, 9],
  ['padaria', 'fernanda', 5, 'O croissant é uma delícia! Vale cada centavo.', 39, 15],
  [
    'padaria',
    'rafael',
    5,
    'Padaria de bairro de verdade. Dá gosto de ver a fila de vizinhos aos domingos.',
    28,
    8,
  ],
  [
    'padaria',
    'beatriz',
    4,
    'Gostei bastante, mas a fila de sábado de manhã é grande. Vale a espera.',
    17,
    9,
  ],
  [
    'padaria',
    'luiz',
    5,
    'Frequento desde que abriu. Qualidade sempre igual, o que é raro hoje em dia.',
    9,
    7,
  ],

  // Farmácia Popular — 7 avaliações (média 4,7)
  [
    'farmacia',
    'antonio',
    5,
    'Atendimento atencioso e o farmacêutico explica tudo com calma. Entrega chegou em meia hora.',
    71,
    11,
  ],
  [
    'farmacia',
    'maria',
    5,
    'Aberta até as 22h todos os dias, já me salvou várias vezes de noitinha. Equipe muito prestativa.',
    63,
    20,
  ],
  [
    'farmacia',
    'joao',
    4,
    'Bom atendimento e preços honestos. O estacionamento na frente é que é complicado.',
    55,
    12,
  ],
  [
    'farmacia',
    'camila',
    5,
    'Fazem aferição de pressão sem enrolação. Equipe muito simpática.',
    44,
    16,
  ],
  [
    'farmacia',
    'juliana',
    5,
    'Sempre encontro o que preciso e quando não tem, eles encomendam rápido.',
    36,
    13,
  ],
  [
    'farmacia',
    'pedro',
    4,
    'Entrega demorou um pouco num dia de chuva, mas fui bem avisado.',
    24,
    19,
  ],
  ['farmacia', 'carlos', 5, 'Ótimo atendimento, recomendo a todos do bairro.', 12, 10],

  // Mercadinho da Vila — 5 avaliações (média 4,6)
  [
    'mercadinho',
    'maria',
    5,
    'Frutas e verduras fresquinhas, sempre. A dona Lúcia conhece todo mundo pelo nome.',
    80,
    17,
  ],
  [
    'mercadinho',
    'rafael',
    5,
    'Prático, perto de casa e com preço bom. Salva quando falta alguma coisa para o jantar.',
    61,
    18,
  ],
  [
    'mercadinho',
    'ana',
    4,
    'Bom mercadinho, só gostaria de mais opções de produtos sem glúten.',
    42,
    14,
  ],
  [
    'mercadinho',
    'luiz',
    5,
    'Atendimento de família. Ainda tem gente que anota na caderneta!',
    27,
    9,
  ],
  [
    'mercadinho',
    'fernanda',
    4,
    'Gostei muito do hortifrúti. Os caixas podiam ser mais ágeis no fim da tarde.',
    14,
    17,
  ],

  // Sabor de Casa Restaurante — 5 avaliações (média 4,6)
  [
    'restaurante',
    'joao',
    5,
    'Feijoada de sábado é de outro mundo. Comida caseira de verdade.',
    76,
    14,
  ],
  [
    'restaurante',
    'camila',
    5,
    'Almoço delicioso e porção generosa. O pudim de leite é obrigatório!',
    57,
    13,
  ],
  [
    'restaurante',
    'juliana',
    4,
    'Comida muito boa. No horário de pico o salão fica cheio, vale chegar cedo.',
    41,
    13,
  ],
  [
    'restaurante',
    'carlos',
    5,
    'Tempero igual ao da minha avó. Voltarei sempre que passar pelo Centro.',
    22,
    14,
  ],
  [
    'restaurante',
    'beatriz',
    4,
    'Gostoso e bem servido. Só acho que podiam abrir também à noite.',
    8,
    12,
  ],

  // Studio Bela Cabeleireiros — 4 avaliações (média 4,75)
  [
    'salao',
    'ana',
    5,
    'A Patrícia entendeu exatamente o corte que eu queria. Saí apaixonada!',
    69,
    16,
  ],
  [
    'salao',
    'fernanda',
    5,
    'Ambiente aconchegante e profissionais muito cuidadosas com o cabelo.',
    51,
    15,
  ],
  [
    'salao',
    'beatriz',
    4,
    'Ótimo resultado na coloração. Marque horário com antecedência porque a agenda lota.',
    33,
    11,
  ],
  [
    'salao',
    'camila',
    5,
    'Manicure impecável e atendimento pontual. Já virei cliente fiel.',
    15,
    17,
  ],

  // TecnoFix Assistência Técnica — 4 avaliações (média 4,5). O Antonio avaliou.
  [
    'tecnofix',
    'antonio',
    5,
    'Trocaram a tela do meu celular em duas horas e o preço foi o combinado. Muito honestos.',
    49,
    15,
  ],
  [
    'tecnofix',
    'pedro',
    4,
    'Resolveram o problema do notebook. Demorou um dia a mais que o prometido, mas avisaram.',
    38,
    16,
  ],
  [
    'tecnofix',
    'rafael',
    5,
    'Diego explica o defeito de um jeito que dá para entender. Recomendo!',
    21,
    14,
  ],
  [
    'tecnofix',
    'beatriz',
    4,
    'Bom serviço e garantia por escrito. Só o espaço da loja é pequeno.',
    10,
    10,
  ],

  // Ateliê Flor de Chita — 3 avaliações (média 4,67)
  [
    'atelie',
    'ana',
    5,
    'Peças lindas e muito bem acabadas. Comprei uma saia que recebe elogio toda vez.',
    44,
    15,
  ],
  [
    'atelie',
    'fernanda',
    5,
    'A Heloísa ajustou a roupa sob medida e ficou perfeita. Trabalho de artista.',
    29,
    16,
  ],
  ['atelie', 'maria', 4, 'Adorei a bolsa de chita. Gostaria de mais opções de cores.', 13, 14],

  // Pet Amigo Banho & Tosa — 4 avaliações (média 4,75)
  [
    'pet',
    'carlos',
    5,
    'Meu cachorro volta cheiroso e feliz. O serviço de leva e traz ajuda demais.',
    40,
    11,
  ],
  ['pet', 'luiz', 5, 'O Bruno trata os bichos com muito carinho. Nota dez.', 26, 10],
  ['pet', 'joao', 5, 'Fui indicado por um vizinho e não me arrependi. Tosa caprichada.', 18, 12],
  ['pet', 'pedro', 4, 'Bom atendimento. Preferia mais horários livres durante a semana.', 6, 9],
]

export function buildReviews(ctx: SeedContext): Review[] {
  return REVIEW_ROWS.map(([biz, author, rating, comment, daysAgo, hour], index) => ({
    id: `rev_${String(index + 1).padStart(3, '0')}`,
    businessId: BUSINESSES[biz].id,
    authorId: RESIDENTS[author].id,
    rating,
    comment,
    createdAt: ctx.at(-daysAgo, hour, (index * 7) % 60),
  }))
}

// ── Favoritos ────────────────────────────────────────────────────────────────

const FAVORITE_ROWS: ReadonlyArray<readonly [ResidentKey, readonly BusinessKey[], number]> = [
  ['antonio', ['farmacia', 'restaurante'], 40],
  ['maria', ['padaria', 'mercadinho'], 60],
  ['joao', ['farmacia', 'restaurante'], 50],
  ['ana', ['atelie', 'salao'], 35],
  ['pedro', ['tecnofix'], 30],
  ['juliana', ['farmacia', 'restaurante'], 45],
  ['carlos', ['pet'], 25],
  ['fernanda', ['salao', 'atelie'], 28],
  ['rafael', ['padaria'], 20],
  ['beatriz', ['tecnofix', 'padaria'], 16],
  ['luiz', ['mercadinho', 'pet'], 12],
  ['camila', ['restaurante', 'farmacia'], 9],
]

export function buildFavorites(ctx: SeedContext): Favorite[] {
  return FAVORITE_ROWS.flatMap(([user, businesses, daysAgo]) =>
    businesses.map((biz, index) => ({
      userId: RESIDENTS[user].id,
      businessId: BUSINESSES[biz].id,
      createdAt: ctx.at(-(daysAgo - index), 10 + index),
    })),
  )
}

// ── Produtos ─────────────────────────────────────────────────────────────────

interface ProductRow {
  /** Identificador curto do produto (sufixo do id). */
  key: string
  name: string
  group: string
  price: Cents
  cost?: Cents
  /** `undefined` = sem controle de estoque. */
  stock?: number
  min?: number
  unit?: ProductUnit
  description?: string
}

const PADARIA_PRODUCTS: readonly ProductRow[] = [
  {
    key: 'pao_frances',
    name: 'Pão francês',
    group: 'Pães',
    price: 90,
    cost: 35,
    stock: 180,
    min: 60,
    description: 'Crocante por fora, macio por dentro. Saindo do forno a toda hora.',
  },
  {
    key: 'pao_queijo',
    name: 'Pão de queijo',
    group: 'Salgados',
    price: 350,
    cost: 140,
    stock: 90,
    min: 30,
    description: 'Tradicional, de queijo minas.',
  },
  {
    key: 'bolo_cenoura',
    name: 'Bolo de cenoura (fatia)',
    group: 'Bolos e doces',
    price: 650,
    cost: 260,
    stock: 24,
    min: 8,
    description: 'Fatia generosa com cobertura de chocolate.',
  },
  {
    key: 'sonho',
    name: 'Sonho de creme',
    group: 'Bolos e doces',
    price: 550,
    cost: 210,
    stock: 30,
    min: 10,
  },
  {
    key: 'croissant',
    name: 'Croissant',
    group: 'Pães',
    price: 790,
    cost: 320,
    stock: 9,
    min: 12,
    description: 'Folhado e amanteigado, assado na hora.',
  },
  {
    key: 'cafe_coado',
    name: 'Café coado',
    group: 'Bebidas',
    price: 400,
    cost: 80,
    description: 'Xícara de café coado na hora.',
  },
  { key: 'cafe_leite', name: 'Café com leite', group: 'Bebidas', price: 600, cost: 150 },
  {
    key: 'suco',
    name: 'Suco natural (300 ml)',
    group: 'Bebidas',
    price: 800,
    cost: 320,
    stock: 22,
    min: 8,
  },
  {
    key: 'coxinha',
    name: 'Coxinha de frango',
    group: 'Salgados',
    price: 650,
    cost: 260,
    stock: 40,
    min: 15,
  },
  {
    key: 'empada',
    name: 'Empada de palmito',
    group: 'Salgados',
    price: 600,
    cost: 240,
    stock: 28,
    min: 10,
  },
  {
    key: 'torta_frango',
    name: 'Torta de frango (fatia)',
    group: 'Salgados',
    price: 1200,
    cost: 520,
    stock: 4,
    min: 5,
  },
  {
    key: 'pao_integral',
    name: 'Pão integral',
    group: 'Pães',
    price: 1190,
    cost: 520,
    stock: 16,
    min: 6,
    unit: 'pct',
    description: 'Pacote de 400 g, com grãos e sementes.',
  },
  {
    key: 'pao_forma',
    name: 'Pão de forma',
    group: 'Pães',
    price: 890,
    cost: 560,
    stock: 20,
    min: 8,
    unit: 'pct',
  },
  {
    key: 'biscoito_polvilho',
    name: 'Biscoito de polvilho',
    group: 'Biscoitos',
    price: 850,
    cost: 330,
    stock: 35,
    min: 10,
    unit: 'pct',
  },
  {
    key: 'leite',
    name: 'Leite integral (1 litro)',
    group: 'Mercearia',
    price: 590,
    cost: 430,
    stock: 36,
    min: 12,
    unit: 'l',
  },
  {
    key: 'manteiga',
    name: 'Manteiga (200 g)',
    group: 'Mercearia',
    price: 1490,
    cost: 1050,
    stock: 3,
    min: 6,
  },
]

const OTHER_PRODUCTS: Partial<Record<BusinessKey, readonly ProductRow[]>> = {
  farmacia: [
    {
      key: 'dipirona',
      name: 'Dipirona 500 mg (cartela)',
      group: 'Medicamentos',
      price: 790,
      cost: 450,
      stock: 60,
      min: 20,
    },
    {
      key: 'protetor',
      name: 'Protetor solar FPS 50',
      group: 'Cuidados com a pele',
      price: 4290,
      cost: 2800,
      stock: 18,
      min: 6,
    },
    {
      key: 'alcool_gel',
      name: 'Álcool em gel 500 ml',
      group: 'Higiene',
      price: 1190,
      cost: 650,
      stock: 40,
      min: 12,
    },
    {
      key: 'soro',
      name: 'Soro fisiológico 500 ml',
      group: 'Higiene',
      price: 790,
      cost: 420,
      stock: 35,
      min: 10,
    },
    {
      key: 'vitamina_c',
      name: 'Vitamina C efervescente',
      group: 'Vitaminas',
      price: 2190,
      cost: 1300,
      stock: 22,
      min: 8,
      unit: 'cx',
    },
    {
      key: 'pressao',
      name: 'Aferição de pressão arterial',
      group: 'Serviços',
      price: 500,
      description: 'Serviço com orientação do farmacêutico.',
    },
  ],
  mercadinho: [
    {
      key: 'banana',
      name: 'Banana prata',
      group: 'Hortifrúti',
      price: 699,
      cost: 420,
      stock: 45,
      min: 12,
      unit: 'kg',
    },
    {
      key: 'tomate',
      name: 'Tomate',
      group: 'Hortifrúti',
      price: 599,
      cost: 350,
      stock: 30,
      min: 10,
      unit: 'kg',
    },
    {
      key: 'arroz',
      name: 'Arroz branco 5 kg',
      group: 'Mercearia',
      price: 2890,
      cost: 2250,
      stock: 24,
      min: 8,
      unit: 'pct',
    },
    {
      key: 'feijao',
      name: 'Feijão carioca 1 kg',
      group: 'Mercearia',
      price: 849,
      cost: 610,
      stock: 40,
      min: 12,
      unit: 'pct',
    },
    {
      key: 'cafe',
      name: 'Café torrado e moído 500 g',
      group: 'Mercearia',
      price: 1790,
      cost: 1280,
      stock: 28,
      min: 10,
      unit: 'pct',
    },
    {
      key: 'detergente',
      name: 'Detergente neutro',
      group: 'Limpeza',
      price: 249,
      cost: 150,
      stock: 60,
      min: 20,
    },
  ],
  restaurante: [
    {
      key: 'pf',
      name: 'Prato feito do dia',
      group: 'Pratos',
      price: 2800,
      description: 'Arroz, feijão, mistura do dia, salada e farofa.',
    },
    {
      key: 'feijoada',
      name: 'Feijoada completa (sábado)',
      group: 'Pratos',
      price: 4200,
      description: 'Serve bem uma pessoa, com acompanhamentos.',
    },
    { key: 'marmitex', name: 'Marmitex média', group: 'Pratos', price: 2400 },
    { key: 'suco_casa', name: 'Suco da casa', group: 'Bebidas', price: 600 },
    { key: 'pudim', name: 'Pudim de leite (fatia)', group: 'Sobremesas', price: 1000 },
  ],
  salao: [
    { key: 'corte_f', name: 'Corte feminino', group: 'Cabelo', price: 7000, unit: 'un' },
    { key: 'corte_m', name: 'Corte masculino', group: 'Cabelo', price: 3500, unit: 'un' },
    { key: 'escova', name: 'Escova modelada', group: 'Cabelo', price: 5000, unit: 'un' },
    { key: 'coloracao', name: 'Coloração', group: 'Cabelo', price: 15000, unit: 'un' },
    { key: 'manicure', name: 'Manicure', group: 'Unhas', price: 3000, unit: 'un' },
  ],
  tecnofix: [
    {
      key: 'tela',
      name: 'Troca de tela de celular',
      group: 'Serviços',
      price: 18000,
      description: 'Valor a partir de; varia conforme o aparelho.',
    },
    { key: 'bateria', name: 'Troca de bateria', group: 'Serviços', price: 12000 },
    { key: 'formatacao', name: 'Formatação e limpeza', group: 'Serviços', price: 9000 },
    {
      key: 'pelicula',
      name: 'Película de vidro',
      group: 'Acessórios',
      price: 2500,
      cost: 800,
      stock: 25,
      min: 8,
    },
    {
      key: 'cabo',
      name: 'Cabo USB-C',
      group: 'Acessórios',
      price: 3000,
      cost: 1100,
      stock: 18,
      min: 6,
    },
  ],
  atelie: [
    {
      key: 'bolsa',
      name: 'Bolsa de chita',
      group: 'Peças artesanais',
      price: 12000,
      cost: 5500,
      stock: 6,
      min: 2,
    },
    {
      key: 'saia',
      name: 'Saia midi de chita',
      group: 'Peças artesanais',
      price: 14000,
      cost: 6200,
      stock: 5,
      min: 2,
    },
    {
      key: 'avental',
      name: 'Avental de cozinha',
      group: 'Peças artesanais',
      price: 6500,
      cost: 2600,
      stock: 9,
      min: 3,
    },
    { key: 'barra', name: 'Ajuste de barra', group: 'Serviços', price: 3500 },
    {
      key: 'oficina',
      name: 'Oficina de costura criativa',
      group: 'Serviços',
      price: 8000,
      description: 'Aula de duas horas, materiais inclusos.',
    },
  ],
  pet: [
    { key: 'banho_p', name: 'Banho — porte pequeno', group: 'Banho e tosa', price: 5500 },
    { key: 'banho_g', name: 'Banho — porte grande', group: 'Banho e tosa', price: 8500 },
    { key: 'tosa', name: 'Tosa higiênica', group: 'Banho e tosa', price: 3500 },
    {
      key: 'racao',
      name: 'Ração premium (por kg)',
      group: 'Produtos',
      price: 2200,
      cost: 1500,
      stock: 40,
      min: 10,
      unit: 'kg',
    },
    {
      key: 'coleira',
      name: 'Coleira ajustável',
      group: 'Produtos',
      price: 3900,
      cost: 1800,
      stock: 12,
      min: 4,
    },
  ],
}

/** Id do produto da Padaria a partir da chave curta. */
export const padariaProductId = (key: string): string => `prd_padaria_${key}`

function toProduct(ctx: SeedContext, bizKey: BusinessKey, row: ProductRow, index: number): Product {
  const tracked = row.stock !== undefined
  return {
    id: `prd_${bizKey}_${row.key}`,
    businessId: BUSINESSES[bizKey].id,
    name: row.name,
    ...(row.description ? { description: row.description } : {}),
    group: row.group,
    priceCents: row.price,
    ...(row.cost !== undefined ? { costCents: row.cost } : {}),
    trackStock: tracked,
    stock: row.stock ?? 0,
    minStock: row.min ?? 0,
    unit: row.unit ?? 'un',
    showInCatalog: true,
    active: true,
    createdAt: ctx.at(-(70 - index), 9),
    updatedAt: ctx.at(-((index % 6) + 1), 8),
  }
}

export const PADARIA_PRODUCT_ROWS = PADARIA_PRODUCTS

export function buildProducts(ctx: SeedContext): Product[] {
  const products = PADARIA_PRODUCTS.map((row, index) => toProduct(ctx, 'padaria', row, index))
  for (const [bizKey, rows] of Object.entries(OTHER_PRODUCTS) as Array<
    [BusinessKey, readonly ProductRow[]]
  >) {
    rows.forEach((row, index) => products.push(toProduct(ctx, bizKey, row, index)))
  }
  return products
}
