import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Plus } from 'lucide-react'
import { useState } from 'react'

import { paths } from '@/app/paths'
import { EventCard } from '@/components/domain'
import {
  AsyncView,
  ButtonLink,
  EmptyState,
  Fab,
  FilterChips,
  Page,
  PageHeader,
  SegmentedControl,
} from '@/components/ui'
import { repos } from '@/repositories'

type When = 'upcoming' | 'past'

/** Eventos comunitários: próximos e realizados, com filtro por categoria. */
export default function EventsPage() {
  const [when, setWhen] = useState<When>('upcoming')
  const [categoryId, setCategoryId] = useState('all')
  const categories = useQuery({
    queryKey: ['reference', 'categories', 'event'],
    queryFn: () => repos.reference.listCategories('event'),
  })
  const events = useQuery({
    queryKey: ['events', { when, categoryId }],
    queryFn: () =>
      repos.events.list({ when, categoryId: categoryId === 'all' ? undefined : categoryId }),
    placeholderData: (previous) => previous,
  })

  return (
    <>
      <PageHeader title="Eventos">
        <SegmentedControl
          ariaLabel="Período dos eventos"
          className="self-start"
          options={[
            { value: 'upcoming', label: 'Próximos' },
            { value: 'past', label: 'Realizados' },
          ]}
          value={when}
          onChange={setWhen}
        />
        <FilterChips
          ariaLabel="Filtrar por categoria"
          options={[
            { value: 'all', label: 'Todos' },
            ...(categories.data ?? []).map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
          value={categoryId}
          onChange={setCategoryId}
        />
      </PageHeader>
      <Page>
        <AsyncView
          query={events}
          empty={
            <EmptyState
              icon={CalendarDays}
              title={
                when === 'upcoming'
                  ? 'Nenhum evento por vir nesta categoria'
                  : 'Nenhum evento realizado nesta categoria'
              }
              description="Que tal organizar algo para a comunidade?"
              action={<ButtonLink to={paths.newEvent}>Criar evento</ButtonLink>}
            />
          }
        >
          {(items) => (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </AsyncView>
      </Page>
      <Fab label="Criar evento" icon={<Plus className="size-6" />} to={paths.newEvent} extended />
    </>
  )
}
