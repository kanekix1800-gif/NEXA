import { useQuery } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { useState } from 'react'

import { paths } from '@/app/paths'
import { DemandCard } from '@/components/domain'
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

type Tab = 'mine' | 'supported'

/** Demandas registradas e apoiadas pelo usuário. */
export default function MyDemandsPage() {
  const user = useCurrentUser()
  const [tab, setTab] = useState<Tab>('mine')
  const demands = useQuery({
    queryKey: ['demands', { tab, userId: user.id }],
    queryFn: () =>
      repos.demands.list(tab === 'mine' ? { authorId: user.id } : { supportedBy: user.id }),
    placeholderData: (previous) => previous,
  })
  return (
    <>
      <PageHeader title="Minhas Demandas" variant="stack" backTo={paths.profile}>
        <SegmentedControl
          ariaLabel="Tipo de demanda"
          className="self-start"
          options={[
            { value: 'mine', label: 'Registradas por mim' },
            { value: 'supported', label: 'Que eu apoio' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </PageHeader>
      <Page>
        <AsyncView
          query={demands}
          empty={
            <EmptyState
              icon={Megaphone}
              title={
                tab === 'mine'
                  ? 'Você ainda não registrou demandas'
                  : 'Você ainda não apoiou demandas'
              }
              description={
                tab === 'mine'
                  ? 'Viu um problema no bairro? Registre e acompanhe por aqui.'
                  : 'Apoie as demandas dos seus vizinhos para dar mais força aos pedidos.'
              }
              action={
                <ButtonLink to={tab === 'mine' ? paths.newDemand : paths.demands}>
                  {tab === 'mine' ? 'Registrar demanda' : 'Ver demandas'}
                </ButtonLink>
              }
            />
          }
        >
          {(items) => (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((demand) => (
                <DemandCard key={demand.id} demand={demand} />
              ))}
            </div>
          )}
        </AsyncView>
      </Page>
    </>
  )
}
