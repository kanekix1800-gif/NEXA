import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

import { paths } from '@/app/paths'
import { DemoBadge, Page, PageHeader } from '@/components/ui'
import { cn } from '@/utils/cn'

const TABS = [
  { to: paths.admin, label: 'Visão geral', end: true },
  { to: paths.adminModeration, label: 'Moderação' },
  { to: paths.adminCategories, label: 'Categorias' },
  { to: paths.adminDemands, label: 'Demandas' },
  { to: paths.adminEvents, label: 'Eventos' },
  { to: paths.adminUsers, label: 'Usuários' },
  { to: paths.adminInstitutions, label: 'Instituições' },
]

/** Moldura das telas administrativas: cabeçalho e abas da área. */
export function AdminShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <>
      <PageHeader
        title="Administração"
        subtitle="Painel da equipe NEXA"
        width="wide"
        actions={actions ?? <DemoBadge />}
      >
        <nav
          aria-label="Seções da administração"
          className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5"
        >
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-[38px] shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-nexa-900 bg-nexa-900 text-white'
                    : 'border-line bg-surface text-ink-700 hover:bg-cream-50',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </PageHeader>
      <Page width="wide">{children}</Page>
    </>
  )
}
