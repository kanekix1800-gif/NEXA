import { ChevronRight, House, Landmark, ShieldCheck, Store, type LucideIcon } from 'lucide-react'

import { ShareAppButton } from '@/components/domain/ShareAppDialog'
import { DemoBadge, IconTile, Spinner } from '@/components/ui'
import { DEMO_ACCOUNT_LIST } from '@/data/demoAccounts'
import type { UserRole } from '@/types'

const ROLE_ICON: Record<UserRole, LucideIcon> = {
  resident: House,
  merchant: Store,
  institution: Landmark,
  admin: ShieldCheck,
}

interface DemoAccessProps {
  /** Perfil em processo de entrada (mostra carregamento). */
  pendingRole: UserRole | null
  onSelect: (role: UserRole) => void
}

/**
 * Acesso rápido aos quatro perfis demonstrativos — a forma mais simples de
 * conhecer o NEXA durante a apresentação. Existe apenas no modo demonstração.
 */
export function DemoAccess({ pendingRole, onSelect }: DemoAccessProps) {
  return (
    <section aria-labelledby="demo-access-title" className="bg-nexa-50 rounded-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="demo-access-title" className="text-ink-900 text-[0.9375rem] font-extrabold">
          Acesso rápido
        </h2>
        <DemoBadge label="Modo demonstração" />
      </div>
      <p className="text-ink-600 mt-1 text-[0.8125rem]">
        Entre com um perfil pronto e explore — sem cadastro e sem senha.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {DEMO_ACCOUNT_LIST.map((account) => (
          <li key={account.role}>
            <button
              type="button"
              onClick={() => onSelect(account.role)}
              disabled={pendingRole !== null}
              data-testid={`demo-${account.role}`}
              className="bg-surface shadow-card hover:shadow-raised flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-[box-shadow,transform] duration-150 active:scale-[0.99] disabled:opacity-60"
            >
              <IconTile icon={ROLE_ICON[account.role]} />
              <span className="min-w-0 flex-1">
                <span className="text-ink-900 block text-sm font-bold">{account.label}</span>
                <span className="text-ink-500 block truncate text-xs">{account.persona}</span>
              </span>
              {pendingRole === account.role ? (
                <Spinner className="text-nexa-800" label="Entrando" />
              ) : (
                <ChevronRight className="text-ink-400 size-5" aria-hidden />
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-center">
        <ShareAppButton />
      </div>
    </section>
  )
}
