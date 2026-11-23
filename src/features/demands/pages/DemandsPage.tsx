import { useQuery } from '@tanstack/react-query'
import { Map as MapIcon, Megaphone, Plus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { paths } from '@/app/paths'
import { DemandCard } from '@/components/domain'
import {
  AsyncView,
  ButtonLink,
  Callout,
  EmptyState,
  Fab,
  FilterChips,
  Page,
  PageHeader,
  SearchInput,
  Select,
} from '@/components/ui'
import { repos, type DemandFilters } from '@/repositories'

type StatusFilter = NonNullable<DemandFilters['status']>
type Sort = NonNullable<DemandFilters['sort']>

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Em aberto' },
  { value: 'registered', label: 'Registradas' },
  { value: 'in_review', label: 'Em análise' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'resolved', label: 'Resolvidas' },
  { value: 'closed', label: 'Encerradas' },
]

/** Lista de demandas da comunidade, com busca, filtros e ordenação. */
export default function DemandsPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('status') as StatusFilter | null
  const status: StatusFilter = STATUS_FILTERS.some((item) => item.value === requested)
    ? requested!
    : 'all'
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const deferredSearch = useDeferredValue(search)

  const categories = useQuery({
    queryKey: ['reference', 'categories', 'demand'],
    queryFn: () => repos.reference.listCategories('demand'),
  })
  const demands = useQuery({
    queryKey: ['demands', { status, categoryId, sort, search: deferredSearch }],
    queryFn: () =>
      repos.demands.list({
        status,
        sort,
        categoryId: categoryId || undefined,
        search: deferredSearch,
      }),
    placeholderData: (previous) => previous,
  })

  return (
    <>
      <PageHeader
        title="Demandas"
        subtitle="Problemas do bairro registrados pela comunidade"
        actions={
          <Link
            to={paths.mapLayer('demands')}
            aria-label="Ver demandas no mapa"
            className="text-nexa-900 bg-nexa-50 hover:bg-nexa-100 flex size-11 items-center justify-center rounded-full"
          >
            <MapIcon className="size-5" aria-hidden />
          </Link>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar demandas…"
          label="Buscar demandas"
        />
        <FilterChips
          ariaLabel="Filtrar por status"
          options={STATUS_FILTERS}
          value={status}
          onChange={(value) =>
            setParams(value === 'all' ? {} : { status: value }, { replace: true })
          }
        />
      </PageHeader>
      <Page>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              aria-label="Categoria"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Todas as categorias</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Ordenar"
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
            >
              <option value="recent">Mais recentes</option>
              <option value="supported">Mais apoiadas</option>
              <option value="urgent">Mais urgentes</option>
            </Select>
          </div>

          <AsyncView
            query={demands}
            empty={
              <EmptyState
                icon={Megaphone}
                title="Nenhuma demanda encontrada"
                description="Ajuste os filtros ou registre um problema do seu bairro."
                action={<ButtonLink to={paths.newDemand}>Registrar demanda</ButtonLink>}
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

          <Callout tone="demo">
            Os status institucionais deste protótipo são simulados: não há integração oficial com
            órgãos públicos.
          </Callout>
        </div>
      </Page>
      <Fab
        label="Registrar demanda"
        icon={<Plus className="size-6" />}
        to={paths.newDemand}
        extended
      />
    </>
  )
}
