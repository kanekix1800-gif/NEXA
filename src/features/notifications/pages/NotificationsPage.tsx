import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  CalendarDays,
  CheckCheck,
  Landmark,
  Megaphone,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { AsyncView, Button, EmptyState, FilterChips, Page, PageHeader } from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import {
  NOTIFICATION_CATEGORY_LABEL,
  type AppNotification,
  type NotificationCategory,
} from '@/types'
import { cn } from '@/utils/cn'
import { timeAgo } from '@/utils/dates'

type Filter = NotificationCategory | 'all'

const ICONS: Record<NotificationCategory, { icon: LucideIcon; style: string }> = {
  community: { icon: Users, style: 'bg-nexa-100 text-nexa-800' },
  demands: { icon: Megaphone, style: 'bg-terracotta-50 text-terracotta-600' },
  events: { icon: CalendarDays, style: 'bg-purple-50 text-purple-600' },
  commerce: { icon: Store, style: 'bg-sun-100 text-sun-700' },
  institutions: { icon: Landmark, style: 'bg-teal-50 text-teal-600' },
  system: { icon: Settings, style: 'bg-ink-100 text-ink-600' },
}

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todas' },
  ...(Object.keys(NOTIFICATION_CATEGORY_LABEL) as NotificationCategory[]).map((value) => ({
    value,
    label: NOTIFICATION_CATEGORY_LABEL[value],
  })),
]

/** Central de notificações: lidas e não lidas, filtros e navegação para o conteúdo. */
export default function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const notifications = useQuery({
    queryKey: ['notifications', { filter }],
    queryFn: () => repos.notifications.list({ category: filter }),
    placeholderData: (previous) => previous,
  })
  const markAll = useAction(
    () => repos.notifications.markAllRead(filter === 'all' ? undefined : filter),
    {
      success: 'Tudo marcado como lido.',
    },
  )
  const unread = (notifications.data ?? []).filter((item) => !item.read).length

  const open = async (notification: AppNotification) => {
    if (!notification.read)
      await repos.notifications.markRead(notification.id).catch(() => undefined)
    if (notification.link) navigate(notification.link)
  }

  return (
    <>
      <PageHeader
        title="Notificações"
        subtitle={
          unread > 0 ? `${unread} não ${unread === 1 ? 'lida' : 'lidas'}` : 'Você está em dia'
        }
        actions={
          unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CheckCheck className="size-4" />}
              loading={markAll.pending}
              onClick={() => void markAll.run()}
            >
              Marcar todas
            </Button>
          )
        }
      >
        <FilterChips
          ariaLabel="Filtrar notificações"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </PageHeader>
      <Page>
        <AsyncView
          query={notifications}
          empty={
            <EmptyState
              icon={Bell}
              title="Nenhuma notificação por aqui"
              description="Quando houver novidades sobre suas demandas, eventos e publicações, elas aparecem aqui."
            />
          }
        >
          {(items) => (
            <ul className="rounded-card bg-surface shadow-card divide-line divide-y overflow-hidden">
              {items.map((notification) => {
                const { icon: Icon, style } = ICONS[notification.category]
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void open(notification)}
                      className={cn(
                        'hover:bg-cream-50 flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors',
                        !notification.read && 'bg-nexa-50/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                          style,
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'text-ink-900 block text-sm leading-snug',
                            notification.read ? 'font-semibold' : 'font-extrabold',
                          )}
                        >
                          {notification.title}
                        </span>
                        <span className="text-ink-600 mt-0.5 line-clamp-2 block text-[13px] leading-snug">
                          {notification.body}
                        </span>
                        <span className="text-ink-400 mt-1 block text-xs">
                          {NOTIFICATION_CATEGORY_LABEL[notification.category]} ·{' '}
                          {timeAgo(notification.createdAt)}
                        </span>
                      </span>
                      {!notification.read && (
                        <span
                          className="bg-sun-400 mt-1.5 size-2.5 shrink-0 rounded-full"
                          aria-label="Não lida"
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </AsyncView>
      </Page>
    </>
  )
}
