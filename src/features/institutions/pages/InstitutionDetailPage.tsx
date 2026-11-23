import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Landmark, Mail, MapPin, Megaphone, Phone } from 'lucide-react'
import { useParams } from 'react-router'

import { paths } from '@/app/paths'
import {
  AsyncView,
  Badge,
  ButtonLink,
  Callout,
  Card,
  DemoBadge,
  EmptyState,
  IconTile,
  InfoRow,
  MediaCover,
  Page,
  PageHeader,
  SectionHeader,
  SkeletonList,
  StatCard,
} from '@/components/ui'
import { repos } from '@/repositories'
import { INSTITUTION_CATEGORY_LABEL, type InstitutionView } from '@/types'
import { contactActions, DEMO_CONTACT_NOTICE } from '@/utils/contact'
import { timeAgo } from '@/utils/dates'

function InstitutionContent({ institution }: { institution: InstitutionView }) {
  const initiatives = useQuery({
    queryKey: ['institutions', institution.id, 'initiatives'],
    queryFn: () => repos.institutions.listInitiatives({ institutionId: institution.id }),
  })
  const contacts = contactActions(institution)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <IconTile
          icon={institution.icon}
          color={institution.color}
          size="lg"
          className="size-20 rounded-[1.75rem] [&_svg]:size-9"
        />
        <div>
          <h2 className="text-ink-900 text-[1.5rem] leading-tight font-extrabold">
            {institution.name}
          </h2>
          <p className="text-ink-500 mt-0.5 text-sm">{institution.tagline}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge color={institution.color}>
            {INSTITUTION_CATEGORY_LABEL[institution.category]}
          </Badge>
          {institution.verified ? (
            <Badge color="green" icon={<BadgeCheck className="size-3" />}>
              Perfil verificado
            </Badge>
          ) : (
            <Badge color="orange">Aguardando verificação</Badge>
          )}
          {institution.isDemo && <DemoBadge label="Exemplo demonstrativo" />}
        </div>
      </header>

      {institution.isMine && (
        <ButtonLink to={paths.institutionPanel} leftIcon={<Megaphone className="size-4" />}>
          Abrir painel institucional
        </ButtonLink>
      )}

      <p className="text-ink-700 text-[15px] leading-relaxed">{institution.description}</p>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Demandas encaminhadas"
          value={institution.demandCount}
          icon={Megaphone}
          hint="simulação"
        />
        <StatCard
          label="Em aberto"
          value={institution.openDemandCount}
          icon="alert"
          color="orange"
        />
      </div>

      {institution.areas.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader title="Áreas de atuação" />
          <div className="flex flex-wrap gap-2">
            {institution.areas.map((area) => (
              <Badge key={area} color="neutral" size="md">
                {area}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {institution.services.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader title="Serviços oferecidos" />
          <Card padding="none" className="divide-line divide-y">
            {institution.services.map((service) => (
              <p key={service} className="text-ink-800 px-4 py-3 text-sm">
                {service}
              </p>
            ))}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeader title="Contato" />
        <Card className="flex flex-col gap-3">
          {institution.address && <InfoRow icon={MapPin}>{institution.address}</InfoRow>}
          {contacts.map((contact) => (
            <InfoRow key={contact.kind} icon={contact.kind === 'email' ? Mail : Phone}>
              {contact.href ? (
                <a href={contact.href} className="text-nexa-800 font-semibold">
                  {contact.value}
                </a>
              ) : (
                contact.value
              )}
            </InfoRow>
          ))}
          {institution.isDemo && <p className="text-ink-400 text-xs">{DEMO_CONTACT_NOTICE}</p>}
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Iniciativas" />
        <AsyncView
          query={initiatives}
          loading={<SkeletonList count={1} />}
          empty={<p className="text-ink-500 text-sm">Nenhuma iniciativa divulgada ainda.</p>}
        >
          {(items) => (
            <div className="flex flex-col gap-3">
              {items.map((initiative) => (
                <Card key={initiative.id} padding="none" className="overflow-hidden">
                  {(initiative.imageUrl || initiative.illustration) && (
                    <MediaCover
                      imageUrl={initiative.imageUrl}
                      illustration={initiative.illustration}
                      alt=""
                      ratio="21/9"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-ink-900 text-[15px] font-bold">{initiative.title}</h3>
                      {initiative.status === 'finished' && <Badge color="neutral">Encerrada</Badge>}
                    </div>
                    <p className="text-ink-600 mt-1 text-[13px] leading-snug">
                      {initiative.description}
                    </p>
                    <p className="text-ink-400 mt-2 text-xs">{timeAgo(initiative.createdAt)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </AsyncView>
      </section>

      {institution.isDemo && (
        <Callout tone="demo">
          Registro de exemplo: o NEXA não possui parceria oficial com a instituição citada, e os
          encaminhamentos de demandas são simulados.
        </Callout>
      )}
    </div>
  )
}

/** Página de uma instituição do diretório. */
export default function InstitutionDetailPage() {
  const { id = '' } = useParams()
  const institution = useQuery({
    queryKey: ['institutions', id],
    queryFn: () => repos.institutions.get(id),
  })
  return (
    <>
      <PageHeader title="Instituição" variant="stack" backTo={paths.institutions} />
      <Page>
        <AsyncView
          query={institution}
          empty={
            <EmptyState
              icon={Landmark}
              title="Instituição não encontrada"
              action={<ButtonLink to={paths.institutions}>Ver instituições</ButtonLink>}
            />
          }
        >
          {(item) => item && <InstitutionContent institution={item} />}
        </AsyncView>
      </Page>
    </>
  )
}
