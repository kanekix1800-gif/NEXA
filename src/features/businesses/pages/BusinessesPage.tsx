import { useQuery } from '@tanstack/react-query'
import { Accessibility, Clock, Heart, Map as MapIcon, Store } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { BusinessCard } from '@/components/domain'
import {
  AsyncView,
  ButtonLink,
  EmptyState,
  FilterChips,
  Page,
  PageHeader,
  SearchInput,
} from '@/components/ui'
import { NeighborhoodPicker } from '@/components/domain/NeighborhoodPicker'
import { STEP_FREE_FEATURES } from '@/components/domain/PlaceAccessibility'
import { useCurrentUser } from '@/contexts/AuthContext'
import { repos, type BusinessFilters } from '@/repositories'
import { cn } from '@/utils/cn'

type Sort = NonNullable<BusinessFilters['sort']>

function ToggleChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors',
        active ? 'border-nexa-800 bg-nexa-50 text-nexa-900' : 'border-line bg-surface text-ink-600',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

/** Catálogo de pequenos negócios: busca, categorias, favoritos e ordenação. */
export default function BusinessesPage() {
  const user = useCurrentUser()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [onlyOpenNow, setOnlyOpenNow] = useState(false)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [onlyStepFree, setOnlyStepFree] = useState(false)
  const [neighborhoodId, setNeighborhoodId] = useState('')
  const [sort, setSort] = useState<Sort>('distance')
  const deferredSearch = useDeferredValue(search)

  const categories = useQuery({
    queryKey: ['reference', 'categories', 'business'],
    queryFn: () => repos.reference.listCategories('business'),
  })
  const businesses = useQuery({
    queryKey: [
      'businesses',
      {
        categoryId,
        onlyOpenNow,
        onlyFavorites,
        onlyStepFree,
        neighborhoodId,
        sort,
        search: deferredSearch,
      },
    ],
    queryFn: () =>
      repos.businesses.list({
        categoryId: categoryId === 'all' ? undefined : categoryId,
        search: deferredSearch,
        onlyOpenNow,
        onlyFavorites,
        neighborhoodId: neighborhoodId || undefined,
        accessibility: onlyStepFree ? STEP_FREE_FEATURES : undefined,
        sort,
      }),
    placeholderData: (previous) => previous,
  })

  return (
    <>
      <PageHeader
        title="Comércio Local"
        actions={
          <Link
            to={paths.mapLayer('businesses')}
            aria-label="Ver comércios no mapa"
            className="text-nexa-900 bg-nexa-50 hover:bg-nexa-100 flex size-11 items-center justify-center rounded-full"
          >
            <MapIcon className="size-5" aria-hidden />
          </Link>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar estabelecimentos…"
          label="Buscar estabelecimentos"
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip
              active={onlyOpenNow}
              onClick={() => setOnlyOpenNow((current) => !current)}
              icon={<Clock className="size-4" aria-hidden />}
            >
              Abertos agora
            </ToggleChip>
            <ToggleChip
              active={onlyFavorites}
              onClick={() => setOnlyFavorites((current) => !current)}
              icon={<Heart className={cn('size-4', onlyFavorites && 'fill-current')} aria-hidden />}
            >
              Favoritos
            </ToggleChip>
            <ToggleChip
              active={onlyStepFree}
              onClick={() => setOnlyStepFree((current) => !current)}
              icon={<Accessibility className="size-4" aria-hidden />}
            >
              Sem degraus
            </ToggleChip>
            <NeighborhoodPicker
              variant="chip"
              value={neighborhoodId}
              onChange={setNeighborhoodId}
              allLabel="Todos os bairros"
              ariaLabel="Bairro"
            />
            <label className="text-ink-600 ml-auto flex items-center gap-1.5 text-[0.8125rem] font-semibold">
              <span className="sr-only sm:not-sr-only">Ordenar:</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Ordenar estabelecimentos"
                className="border-line bg-surface text-ink-800 h-9 rounded-full border px-3 text-[0.8125rem] font-semibold outline-none"
              >
                <option value="distance">Mais perto</option>
                <option value="rating">Melhor avaliados</option>
                <option value="name">Nome (A–Z)</option>
              </select>
            </label>
          </div>

          <AsyncView
            query={businesses}
            empty={
              <EmptyState
                icon={Store}
                title="Nenhum estabelecimento encontrado"
                description="Tente outra categoria ou limpe os filtros."
              />
            }
          >
            {(items) => (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {items.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>
            )}
          </AsyncView>

          {user.role !== 'merchant' || !user.businessId ? (
            <div className="bg-nexa-900 rounded-card mt-2 flex items-center gap-4 p-5 text-white">
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold">Tem um negócio no bairro?</p>
                <p className="mt-0.5 text-[0.8125rem] text-white/75">
                  Divulgue no NEXA e organize vendas, estoque e finanças.
                </p>
              </div>
              <ButtonLink to={paths.newBusiness} variant="accent" size="sm">
                Cadastrar
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </Page>
    </>
  )
}
