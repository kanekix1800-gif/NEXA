import { useQuery } from '@tanstack/react-query'
import { Handshake, Landmark } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { InstitutionRow } from '@/components/domain'
import {
  AsyncView,
  Callout,
  EmptyState,
  FilterChips,
  IconTile,
  ListGroup,
  Page,
  PageHeader,
  SegmentedControl,
} from '@/components/ui'
import { repos } from '@/repositories'
import {
  INSTITUTION_CATEGORY_LABEL,
  PUBLIC_SERVICE_KIND_LABEL,
  type InstitutionCategory,
} from '@/types'
import { formatDistance } from '@/utils/format'

type Tab = 'institutions' | 'services'
type CategoryFilter = InstitutionCategory | 'all'

/** Diretório de instituições e de serviços públicos de referência. */
export default function InstitutionsPage() {
  const [tab, setTab] = useState<Tab>('institutions')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const all = useQuery({
    queryKey: ['institutions', 'directory'],
    queryFn: () => repos.institutions.list(),
  })
  const services = useQuery({
    queryKey: ['institutions', 'services'],
    queryFn: () => repos.institutions.listServices(),
    enabled: tab === 'services',
  })

  // Mostra apenas as categorias que têm instituições (evita filtros vazios).
  const present = [...new Set((all.data ?? []).map((institution) => institution.category))]
  const filtered = (all.data ?? []).filter(
    (institution) => category === 'all' || institution.category === category,
  )

  return (
    <>
      <PageHeader title="Instituições" subtitle="Conheça quem atua pela sua comunidade">
        <SegmentedControl
          ariaLabel="Tipo de listagem"
          className="self-start"
          options={[
            { value: 'institutions', label: 'Instituições' },
            { value: 'services', label: 'Serviços públicos' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'institutions' && present.length > 1 && (
          <FilterChips
            ariaLabel="Filtrar por tipo de instituição"
            options={[
              { value: 'all', label: 'Todas' },
              ...present.map((value) => ({ value, label: INSTITUTION_CATEGORY_LABEL[value] })),
            ]}
            value={category}
            onChange={setCategory}
          />
        )}
      </PageHeader>
      <Page>
        <div className="flex flex-col gap-4">
          {tab === 'institutions' ? (
            <AsyncView
              query={all}
              isEmpty={() => filtered.length === 0}
              empty={<EmptyState icon={Landmark} title="Nenhuma instituição nesta categoria" />}
            >
              {() => (
                <ListGroup>
                  {filtered.map((institution) => (
                    <InstitutionRow key={institution.id} institution={institution} />
                  ))}
                </ListGroup>
              )}
            </AsyncView>
          ) : (
            <AsyncView
              query={services}
              empty={<EmptyState icon={Landmark} title="Nenhum serviço cadastrado" />}
            >
              {(items) => (
                <ListGroup>
                  {items.map((service) => (
                    <Link
                      key={service.id}
                      to={paths.publicService(service.id)}
                      className="hover:bg-cream-50 flex items-center gap-3.5 px-4 py-3.5 transition-colors"
                    >
                      <IconTile icon={service.icon} color={service.color} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="text-ink-900 block truncate text-[15px] font-bold">
                          {service.name}
                        </span>
                        <span className="text-ink-500 block truncate text-[13px]">
                          {PUBLIC_SERVICE_KIND_LABEL[service.kind]} · {service.neighborhoodName}
                          {service.distanceMeters !== null &&
                            ` · ${formatDistance(service.distanceMeters)}`}
                        </span>
                      </span>
                    </Link>
                  ))}
                </ListGroup>
              )}
            </AsyncView>
          )}

          <div className="bg-nexa-900 rounded-card flex items-center justify-between gap-4 p-5 text-white">
            <p className="max-w-[12rem] text-lg leading-tight font-extrabold">
              Juntos por uma cidade melhor
            </p>
            <span className="bg-white/12 flex size-14 shrink-0 items-center justify-center rounded-2xl">
              <Handshake className="text-sun-400 size-8" aria-hidden />
            </span>
          </div>

          <Callout tone="demo" title="Diretório demonstrativo">
            As instituições e os serviços listados são exemplos para demonstração. O NEXA não possui
            parceria oficial com as organizações citadas.
          </Callout>
        </div>
      </Page>
    </>
  )
}
