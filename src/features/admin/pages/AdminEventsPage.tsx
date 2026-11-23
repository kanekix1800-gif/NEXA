import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { AsyncView, Badge, Button, ButtonLink, DateBadge, EmptyState } from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import type { EventView } from '@/types'
import { pluralize } from '@/utils/text'

import { AdminShell } from '../components/AdminShell'

/** Gestão dos eventos demonstrativos: cancelar e remover. */
export default function AdminEventsPage() {
  const events = useQuery({
    queryKey: ['events', { admin: true }],
    queryFn: () => repos.events.list({ when: 'all', includeCancelled: true }),
  })
  const cancel = useAction((event: EventView) => repos.events.cancel(event.id), {
    success: 'Evento cancelado.',
  })
  const remove = useAction((event: EventView) => repos.events.remove(event.id), {
    success: 'Evento removido.',
  })

  return (
    <AdminShell>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <ButtonLink to={paths.newEvent} size="sm" leftIcon={<Plus className="size-4" />}>
            Criar evento
          </ButtonLink>
        </div>
        <AsyncView
          query={events}
          empty={<EmptyState icon={CalendarDays} title="Nenhum evento cadastrado" />}
        >
          {(items) => (
            <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
              {items.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <DateBadge date={event.startsAt} className="size-12 rounded-xl" />
                  <div className="min-w-0 flex-1 basis-56">
                    <Link
                      to={paths.event(event.id)}
                      className="text-ink-900 hover:text-nexa-800 block truncate text-sm font-bold"
                    >
                      {event.title}
                    </Link>
                    <p className="text-ink-500 flex flex-wrap items-center gap-x-1.5 text-xs">
                      {event.organizerView.name} · {event.venue} ·{' '}
                      {pluralize(event.attendeeCount, 'confirmado', 'confirmados')}
                      {event.status === 'cancelled' && <Badge color="terracotta">Cancelado</Badge>}
                      {event.status !== 'cancelled' && event.isPast && (
                        <Badge color="neutral">Realizado</Badge>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {event.status === 'scheduled' && !event.isPast && (
                      <>
                        <ButtonLink to={paths.editEvent(event.id)} size="sm" variant="outline">
                          Editar
                        </ButtonLink>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={cancel.pending}
                          onClick={() => void cancel.run(event)}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger-600"
                      disabled={remove.pending}
                      onClick={() => void remove.run(event)}
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      </div>
    </AdminShell>
  )
}
