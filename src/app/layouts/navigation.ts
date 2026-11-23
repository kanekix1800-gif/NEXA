import {
  Accessibility,
  Bell,
  BusFront,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  CircleUserRound,
  ClipboardList,
  HandHeart,
  House,
  Landmark,
  Map,
  Megaphone,
  Package,
  PenLine,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { can } from '@/services/permissions'
import type { User } from '@/types'

import { paths } from '../paths'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Corresponde apenas à rota exata (sem sub-rotas). */
  end?: boolean
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

/** Itens da navegação inferior (o botão central "+" é tratado à parte). */
export const BOTTOM_NAV: { left: NavItem[]; right: NavItem[] } = {
  left: [
    { to: paths.home, label: 'Início', icon: House },
    { to: paths.community, label: 'Comunidade', icon: Users },
  ],
  right: [
    { to: paths.notifications, label: 'Notificações', icon: Bell },
    { to: paths.profile, label: 'Perfil', icon: CircleUserRound },
  ],
}

/** Seções da barra lateral (desktop), de acordo com o perfil. */
export function sidebarSections(user: User): NavSection[] {
  const sections: NavSection[] = [
    {
      items: [
        { to: paths.home, label: 'Início', icon: House },
        { to: paths.community, label: 'Comunidade', icon: Users },
        { to: paths.demands, label: 'Demandas', icon: Megaphone },
        { to: paths.map, label: 'Mapa inteligente', icon: Map },
        { to: paths.mobility, label: 'Mobilidade acessível', icon: BusFront },
        { to: paths.businesses, label: 'Comércio Local', icon: Store },
        { to: paths.events, label: 'Eventos', icon: CalendarDays },
        { to: paths.institutions, label: 'Instituições', icon: Landmark },
        { to: paths.assistant, label: 'NEXA IA', icon: Sparkles },
      ],
    },
  ]

  if (user.role === 'merchant') {
    sections.push({
      title: 'NEXA Business',
      items: [
        { to: paths.businessDashboard, label: 'Painel', icon: ChartColumn, end: true },
        { to: paths.businessProducts, label: 'Produtos', icon: Package },
        { to: paths.businessSales, label: 'Vendas', icon: Receipt },
        { to: paths.businessFinance, label: 'Finanças', icon: Wallet },
      ],
    })
  }
  if (can(user, 'institution:panel')) {
    sections.push({
      title: 'Instituição',
      items: [{ to: paths.institutionPanel, label: 'Painel institucional', icon: ClipboardList }],
    })
  }
  if (can(user, 'admin:access')) {
    sections.push({
      title: 'Administração',
      items: [{ to: paths.admin, label: 'Painel administrativo', icon: ShieldCheck }],
    })
  }

  sections.push({
    title: 'Conta',
    items: [
      { to: paths.notifications, label: 'Notificações', icon: Bell },
      { to: paths.profile, label: 'Perfil', icon: CircleUserRound },
      { to: paths.accessibility, label: 'Acessibilidade', icon: Accessibility },
    ],
  })
  return sections
}

export interface QuickAction {
  to: string
  title: string
  description: string
  icon: LucideIcon
}

/** Ações do botão central "+", variando conforme o tipo de usuário. */
export function quickActions(user: User): QuickAction[] {
  const actions: QuickAction[] = [
    {
      to: paths.newPost(),
      title: 'Criar publicação',
      description: 'Compartilhe uma novidade, dúvida ou iniciativa.',
      icon: PenLine,
    },
    {
      to: paths.newDemand,
      title: 'Registrar demanda',
      description: 'Informe um problema do seu bairro.',
      icon: Megaphone,
    },
    {
      to: paths.newEvent,
      title: 'Criar evento',
      description: 'Convide a comunidade para participar.',
      icon: CalendarPlus,
    },
  ]

  if (user.role === 'merchant' && user.businessId) {
    actions.push(
      {
        to: paths.newPost('commerce'),
        title: 'Divulgar negócio',
        description: 'Publique uma novidade do seu estabelecimento.',
        icon: Store,
      },
      {
        to: paths.businessNewSale,
        title: 'Registrar venda',
        description: 'Lance uma venda e atualize o estoque.',
        icon: Receipt,
      },
    )
  } else if (user.role === 'merchant' || user.role === 'resident') {
    actions.push({
      to: paths.newBusiness,
      title: 'Divulgar negócio',
      description: 'Cadastre seu estabelecimento no Comércio Local.',
      icon: Store,
    })
  } else if (user.role === 'institution') {
    actions.push({
      to: `${paths.institutionPanel}?nova=iniciativa`,
      title: 'Divulgar iniciativa',
      description: 'Apresente um programa ou campanha da instituição.',
      icon: HandHeart,
    })
  }
  return actions
}
