import type { ID, UserRole } from '@/types'

/**
 * CONTAS DEMONSTRATIVAS
 * ─────────────────────────────────────────────────────────────────────────────
 * Uma conta de acesso rápido por perfil, usada na apresentação do protótipo.
 * Os IDs abaixo são estáveis: a base demonstrativa (`seed.ts`) precisa criar
 * exatamente estes usuários.
 */
export interface DemoAccount {
  userId: ID
  role: UserRole
  email: string
  /** Rótulo do botão de acesso rápido. */
  label: string
  /** Quem é a pessoa demonstrativa por trás da conta. */
  persona: string
  /** O que este perfil permite demonstrar. */
  description: string
}

export const DEMO_ACCOUNTS: Record<UserRole, DemoAccount> = {
  resident: {
    userId: 'usr_antonio',
    role: 'resident',
    email: 'morador@nexa.demo',
    label: 'Entrar como morador',
    persona: 'Antonio Silva',
    description: 'Feed da comunidade, demandas, mapa, comércio, eventos e NEXA IA.',
  },
  merchant: {
    userId: 'usr_carla',
    role: 'merchant',
    email: 'comerciante@nexa.demo',
    label: 'Entrar como comerciante',
    persona: 'Carla Mendes · Padaria do Bairro',
    description: 'NEXA Business: produtos, vendas, estoque, finanças e IA empresarial.',
  },
  institution: {
    userId: 'usr_roberto',
    role: 'institution',
    email: 'instituicao@nexa.demo',
    label: 'Entrar como instituição',
    persona: 'Roberto Nunes · Prefeitura Municipal (demonstração)',
    description: 'Painel institucional: demandas encaminhadas, atualizações e iniciativas.',
  },
  admin: {
    userId: 'usr_helena',
    role: 'admin',
    email: 'admin@nexa.demo',
    label: 'Entrar como administrador',
    persona: 'Helena Duarte · Equipe NEXA',
    description: 'Painel administrativo: indicadores, moderação, categorias e usuários.',
  },
}

export const DEMO_ACCOUNT_LIST: DemoAccount[] = [
  DEMO_ACCOUNTS.resident,
  DEMO_ACCOUNTS.merchant,
  DEMO_ACCOUNTS.institution,
  DEMO_ACCOUNTS.admin,
]

/**
 * Senha PÚBLICA das contas demonstrativas (também documentada no README).
 * É apenas uma credencial de demonstração: no banco local ficam somente as
 * derivações PBKDF2 (`demoCredentials.ts`), nunca a senha em texto puro.
 */
export const DEMO_PASSWORD = 'nexa1234'

/** IDs fixos de registros demonstrativos referenciados fora da carga de dados. */
export const DEMO_IDS = {
  /** Estabelecimento da comerciante demonstrativa. */
  merchantBusiness: 'biz_padaria',
  /** Instituição representada pela conta institucional demonstrativa. */
  demoInstitution: 'ins_prefeitura',
} as const
