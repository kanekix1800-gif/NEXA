import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useMatches, useNavigate } from 'react-router'

import { Logo } from '@/components/brand/Logo'
import { Avatar, Button, CountBadge, DemoBadge, IconTile, Modal } from '@/components/ui'
import { config } from '@/config'
import { useCurrentUser } from '@/contexts/AuthContext'
import { repos } from '@/repositories'
import { USER_ROLE_LABEL } from '@/types'
import { cn } from '@/utils/cn'

import { paths } from '../paths'
import type { RouteHandle } from '../router'
import { BOTTOM_NAV, quickActions, sidebarSections, type NavItem } from './navigation'

/** Quantidade de notificações não lidas (compartilhada pela navegação). */
function useUnreadCount(): number {
  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => repos.notifications.unreadCount(),
  })
  return query.data ?? 0
}

function BottomNavItem({ item, badge }: { item: NavItem; badge?: number }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[min(0.6875rem,12px)] font-semibold tracking-tight transition-colors',
          isActive ? 'text-nexa-900' : 'text-ink-400 hover:text-ink-600',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon className="size-[1.375rem]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
            {badge !== undefined && (
              <CountBadge count={badge} className="absolute -top-1.5 -right-2" />
            )}
          </span>
          <span className="max-w-full truncate px-0.5">
            {item.label}
            {badge !== undefined && badge > 0 && (
              <span className="sr-only">, {badge} não lidas</span>
            )}
          </span>
        </>
      )}
    </NavLink>
  )
}

/** Navegação inferior (celular): Início, Comunidade, botão "+", Notificações e Perfil. */
function BottomNav({ onCreate, unread }: { onCreate: () => void; unread: number }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="bg-surface/95 border-line shadow-nav z-nav fixed inset-x-0 bottom-0 border-t backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex h-[4.75rem] max-w-xl items-stretch px-1 pb-safe">
        {BOTTOM_NAV.left.map((item) => (
          <BottomNavItem key={item.to} item={item} />
        ))}
        <div className="flex w-16 shrink-0 items-start justify-center">
          <button
            type="button"
            onClick={onCreate}
            aria-label="Criar"
            aria-haspopup="dialog"
            className="bg-nexa-900 hover:bg-nexa-800 shadow-float ring-canvas -mt-5 flex size-14 items-center justify-center rounded-full text-white ring-4 transition-[background-color,transform] duration-150 active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {BOTTOM_NAV.right.map((item) => (
          <BottomNavItem
            key={item.to}
            item={item}
            badge={item.to === paths.notifications ? unread : undefined}
          />
        ))}
      </div>
    </nav>
  )
}

/** Barra lateral (desktop) com toda a navegação do perfil. */
function Sidebar({ onCreate, unread }: { onCreate: () => void; unread: number }) {
  const user = useCurrentUser()
  return (
    <aside className="bg-surface border-line fixed inset-y-0 left-0 hidden w-64 flex-col border-r lg:flex">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <Link to={paths.home} aria-label="NEXA — início">
          <Logo size="sm" />
        </Link>
        {config.isDemoMode && <DemoBadge />}
      </div>
      <div className="px-4 pb-3">
        <Button fullWidth leftIcon={<Plus className="size-5" />} onClick={onCreate}>
          Criar
        </Button>
      </div>
      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 pb-4">
        {sidebarSections(user).map((section, index) => (
          <div key={section.title ?? index} className="mt-3 first:mt-0">
            {section.title && (
              <p className="text-ink-400 px-3 pt-2 pb-1 text-[0.6875rem] font-bold tracking-wider uppercase">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-nexa-50 text-nexa-900'
                        : 'text-ink-600 hover:bg-cream-50 hover:text-ink-900',
                    )
                  }
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.to === paths.notifications && <CountBadge count={unread} />}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <Link
        to={paths.profile}
        className="border-line hover:bg-cream-50 flex items-center gap-3 border-t px-4 py-3.5 transition-colors"
      >
        <Avatar name={user.name} avatar={user.avatar} photoUrl={user.photoUrl} />
        <span className="min-w-0">
          <span className="text-ink-900 block truncate text-sm font-bold">{user.name}</span>
          <span className="text-ink-500 block text-xs">{USER_ROLE_LABEL[user.role]}</span>
        </span>
      </Link>
    </aside>
  )
}

/** Folha de ações rápidas aberta pelo botão "+". */
function QuickActionsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="O que você quer fazer?"
      description="Escolha uma ação para começar."
      size="sm"
    >
      <ul className="flex flex-col gap-2.5">
        {quickActions(user).map((action) => (
          <li key={action.title}>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                navigate(action.to)
              }}
              className="bg-surface shadow-card hover:shadow-raised rounded-tile flex w-full items-center gap-3.5 p-3.5 text-left transition-[box-shadow,transform] duration-150 active:scale-[0.99]"
            >
              <IconTile icon={action.icon} size="lg" />
              <span className="min-w-0">
                <span className="text-ink-900 block text-[0.9375rem] font-bold">
                  {action.title}
                </span>
                <span className="text-ink-500 block text-[0.8125rem] leading-snug">
                  {action.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

/**
 * Estrutura das telas autenticadas: navegação inferior no celular, barra lateral
 * no desktop e a folha de ações rápidas do botão "+".
 */
export function AppLayout() {
  const matches = useMatches()
  const hideBottomNav = matches.some(
    (match) => (match.handle as RouteHandle | undefined)?.hideBottomNav,
  )
  const [creating, setCreating] = useState(false)
  const unread = useUnreadCount()

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#conteudo"
        className="bg-nexa-900 z-toast sr-only rounded-full px-4 py-2 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar onCreate={() => setCreating(true)} unread={unread} />
      <main id="conteudo" className="min-h-dvh">
        <Outlet />
      </main>
      {!hideBottomNav && <BottomNav onCreate={() => setCreating(true)} unread={unread} />}
      <QuickActionsSheet open={creating} onOpenChange={setCreating} />
    </div>
  )
}
