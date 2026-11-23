import { useQuery } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { DemandStatusBadge } from '@/components/domain'
import { AsyncView, Callout, EmptyState, FilterChips, IconTile } from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos, type DemandFilters } from '@/repositories'
import { timeAgo } from '@/utils/dates'
import { pluralize } from '@/utils/text'

import { AdminShell } from '../components/AdminShell'

type StatusFilter = NonNullable<DemandFilters['status']>

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Em aberto' },
  { value: 'resolved', label: 'Resolvidas' },
  { value: 'closed', label: 'Encerradas' },
]

/** Visualização de todas as demandas, com encaminhamento para instituições. */
export default function AdminDemandsPage() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const demands = useQuery({
    queryKey: ['demands', { admin: true, status }],
    queryFn: () => repos.demands.list({ status }),
    placeholderData: (previous) => previous,
  })
  const institutions = useQuery({
    queryKey: ['institutions', 'directory'],
    queryFn: () => repos.institutions.list(),
  })
  const assign = useAction(
    (demandId: string, institutionId: string) =>
      repos.demands.assignInstitution(demandId, institutionId || null),
    { success: 'Encaminhamento atualizado.' },
  )

  return (
    <AdminShell>
      <div className="flex flex-col gap-4">
        <FilterChips
          ariaLabel="Filtrar por status"
          options={FILTERS}
          value={status}
          onChange={setStatus}
        />
        <AsyncView
          query={demands}
          empty={<EmptyState icon={Megaphone} title="Nenhuma demanda com este filtro" />}
        >
          {(items) => (
            <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
              {items.map((demand) => (
                <li key={demand.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <IconTile icon={demand.category.icon} color={demand.category.color} />
                  <div className="min-w-0 flex-1 basis-60">
                    <Link
                      to={paths.demand(demand.id)}
                      className="text-ink-900 hover:text-nexa-800 block truncate text-sm font-bold"
                    >
                      {demand.title}
                    </Link>
                    <p className="text-ink-500 truncate text-xs">
                      {demand.protocol} · {demand.neighborhoodName} ·{' '}
                      {pluralize(demand.supportCount, 'apoio', 'apoios')} ·{' '}
                      {timeAgo(demand.createdAt)}
                    </p>
                  </div>
                  <DemandStatusBadge status={demand.status} />
                  <select
                    aria-label={`Instituição responsável por ${demand.title}`}
                    value={demand.institutionId ?? ''}
                    disabled={assign.pending}
                    onChange={(event) => void assign.run(demand.id, event.target.value)}
                    className="border-line bg-surface text-ink-800 h-9 max-w-52 rounded-full border px-3 text-xs font-semibold outline-none"
                  >
                    <option value="">Sem instituição</option>
                    {(institutions.data ?? []).map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
        <Callout tone="demo">
          O encaminhamento a instituições é demonstrativo. Abra uma demanda para publicar
          atualizações de status (marcadas como “Simulação”).
        </Callout>
      </div>
    </AdminShell>
  )
}
