import { useQuery } from '@tanstack/react-query'
import { Clock, Landmark, MapPin, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { paths } from '@/app/paths'
import { MapView } from '@/components/map'
import {
  AsyncView,
  Badge,
  ButtonLink,
  Callout,
  Card,
  EmptyState,
  IconTile,
  InfoRow,
  Page,
  PageHeader,
  SectionHeader,
} from '@/components/ui'
import { repos } from '@/repositories'
import { PUBLIC_SERVICE_KIND_LABEL } from '@/types'
import { formatDistance, formatPhone } from '@/utils/format'

/** Detalhes de um serviço público de referência (UBS, escola, CRAS…). */
export default function PublicServicePage() {
  const { id = '' } = useParams()
  const service = useQuery({
    queryKey: ['services', id],
    queryFn: () => repos.institutions.getService(id),
  })

  return (
    <>
      <PageHeader title="Serviço público" variant="stack" backTo={paths.institutions} />
      <Page>
        <AsyncView
          query={service}
          empty={
            <EmptyState
              icon={Landmark}
              title="Serviço não encontrado"
              action={<ButtonLink to={paths.institutions}>Ver instituições</ButtonLink>}
            />
          }
        >
          {(item) =>
            item && (
              <div className="flex flex-col gap-6">
                <header className="flex items-center gap-4 pt-2">
                  <IconTile
                    icon={item.icon}
                    color={item.color}
                    size="lg"
                    className="size-16 rounded-3xl [&_svg]:size-8"
                  />
                  <div className="min-w-0">
                    <h2 className="text-ink-900 text-xl leading-tight font-extrabold">
                      {item.name}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge color={item.color}>{PUBLIC_SERVICE_KIND_LABEL[item.kind]}</Badge>
                      {item.distanceMeters !== null && (
                        <span className="text-ink-500 text-xs font-semibold">
                          {formatDistance(item.distanceMeters)} de você
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                <p className="text-ink-700 text-[15px] leading-relaxed">{item.description}</p>

                <Card className="flex flex-col gap-3">
                  <InfoRow icon={MapPin}>
                    {item.address}
                    <span className="text-ink-500 block text-[13px]">{item.neighborhoodName}</span>
                  </InfoRow>
                  <InfoRow icon={Clock}>{item.hours}</InfoRow>
                  {item.phone && (
                    <InfoRow icon={Phone}>{formatPhone(item.phone)} (fictício)</InfoRow>
                  )}
                  {item.institutionId && item.institutionName && (
                    <InfoRow icon={Landmark}>
                      Responsável:{' '}
                      <Link
                        to={paths.institution(item.institutionId)}
                        className="text-nexa-800 font-bold"
                      >
                        {item.institutionName}
                      </Link>
                    </InfoRow>
                  )}
                </Card>

                <section className="flex flex-col gap-3">
                  <SectionHeader
                    title="Localização"
                    to={paths.mapFocus('services', item.id)}
                    actionLabel="Ver no mapa"
                  />
                  <MapView
                    label={`Localização de ${item.name}`}
                    interactive={false}
                    className="rounded-card border-line h-48 border"
                    markers={[
                      {
                        id: item.id,
                        location: item.location,
                        color: item.color,
                        icon: item.icon,
                        title: item.name,
                      },
                    ]}
                  />
                </section>

                <Callout tone="demo">
                  Serviço de exemplo da base demonstrativa: endereço, horário e contato são
                  fictícios.
                </Callout>
              </div>
            )
          }
        </AsyncView>
      </Page>
    </>
  )
}
