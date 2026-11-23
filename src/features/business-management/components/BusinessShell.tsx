import { ChartColumn, Package, Receipt, Sparkles, Store, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

import { paths } from '@/app/paths'
import {
  ButtonLink,
  DemoBadge,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  SkeletonList,
} from '@/components/ui'
import { config } from '@/config'
import type { BusinessView } from '@/types'
import { cn } from '@/utils/cn'

import { useMyBusiness } from '../useBusinessData'

const TABS = [
  { to: paths.businessDashboard, label: 'Painel', icon: ChartColumn, end: true },
  { to: paths.businessProducts, label: 'Produtos', icon: Package },
  { to: paths.businessSales, label: 'Vendas', icon: Receipt },
  { to: paths.businessFinance, label: 'Finanças', icon: Wallet },
  { to: paths.businessInsights, label: 'NEXA IA', icon: Sparkles },
]

interface BusinessShellProps {
  /** Conteúdo da tela, recebendo o estabelecimento do comerciante. */
  children: (business: BusinessView) => ReactNode
  /** Ação à direita do cabeçalho. */
  actions?: ReactNode
}

/**
 * Moldura das telas do NEXA Business: cabeçalho com o nome do negócio, abas da área
 * e tratamento do caso "comerciante ainda sem estabelecimento".
 */
export function BusinessShell({ children, actions }: BusinessShellProps) {
  const business = useMyBusiness()

  return (
    <>
      <PageHeader
        title="NEXA Business"
        subtitle={business.data?.name}
        width="wide"
        actions={
          actions ?? (config.isDemoMode ? <DemoBadge label="Dados demonstrativos" /> : undefined)
        }
      >
        <nav
          aria-label="Seções do NEXA Business"
          className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5"
        >
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-nexa-900 bg-nexa-900 text-white'
                    : 'border-line bg-surface text-ink-700 hover:bg-cream-50',
                )
              }
            >
              <tab.icon className="size-4" aria-hidden />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </PageHeader>
      <Page width="wide">
        {business.isPending ? (
          <SkeletonList count={3} />
        ) : business.isError ? (
          <ErrorState error={business.error} onRetry={() => void business.refetch()} />
        ) : business.data ? (
          children(business.data)
        ) : (
          <EmptyState
            icon={Store}
            title="Cadastre seu estabelecimento"
            description="Para usar o NEXA Business, primeiro registre o seu negócio no Comércio Local."
            action={<ButtonLink to={paths.newBusiness}>Cadastrar estabelecimento</ButtonLink>}
          />
        )}
      </Page>
    </>
  )
}
