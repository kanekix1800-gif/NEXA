import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'

import { paths } from '@/app/paths'
import { EventCard } from '@/components/domain'
import {
  AsyncView,
  ButtonLink,
  EmptyState,
  Page,
  PageHeader,
  SegmentedControl,
} from '@/components/ui'
import { useCurrentUser } from '@/contexts/AuthContext'
import { repos } from '@/repositories'

type Tab = 'attending' | 'created'

/** Eventos com presença confirmada e eventos criados pelo usuário. */
export default function MyEventsPage() {
  const user = useCurrentUser()
  const [tab, setTab] = useState<Tab>('attending')
  const events = useQuery({
    queryKey: ['events', { tab, userId: user.id }],
    queryFn: () =>
      repos.events.list(
        tab === 'attending'
          ? { when: 'all', attendeeId: user.id }
          : { when: 'all', createdBy: user.id, includeCancelled: true },
      ),
    placeholderData: (previous) => previous,
  })
  return (
    <>
      <PageHeader title="Meus Eventos" variant="stack" backTo={paths.profile}>
        <SegmentedControl
          ariaLabel="Tipo de evento"
          className="self-start"
          options={[
            { value: 'attending', label: 'Vou participar' },
            { value: 'created', label: 'Criados por mim' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </PageHeader>
      <Page>
        <AsyncView
          query={events}
          empty={
            <EmptyState
              icon={CalendarDays}
              title={
                tab === 'attending' ? 'Nenhuma presença confirmada' : 'Você ainda não criou eventos'
              }
              description={
                tab === 'attending'
                  ? 'Confirme participação em um evento para vê-lo aqui.'
                  : 'Organize um encontro, mutirão ou oficina no seu bairro.'
              }
              action={
                <ButtonLink to={tab === 'attending' ? paths.events : paths.newEvent}>
                  {tab === 'attending' ? 'Ver eventos' : 'Criar evento'}
                </ButtonLink>
              }
            />
          }
        >
          {(items) => (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </AsyncView>
      </Page>
    </>
  )
}
