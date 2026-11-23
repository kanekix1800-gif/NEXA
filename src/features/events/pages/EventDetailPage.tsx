import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CircleCheck, Clock, MapPin, Pencil, Share2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { paths } from '@/app/paths'
import { CategoryBadge } from '@/components/domain'
import { MapView } from '@/components/map'
import {
  AsyncView,
  AvatarGroup,
  Badge,
  Button,
  ButtonLink,
  Callout,
  Card,
  ConfirmDialog,
  EmptyState,
  EntityAvatarView,
  IconButton,
  InfoRow,
  MediaCover,
  notify,
  Page,
  PageHeader,
  SectionHeader,
  Skeleton,
} from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import type { EventView } from '@/types'
import { formatEventTimeRange, formatWeekdayDate } from '@/utils/dates'
import { shareLink } from '@/utils/share'
import { pluralize } from '@/utils/text'

function EventContent({ event }: { event: EventView }) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const attend = useAction(() => repos.events.toggleAttendance(event.id), {
    success: (result) =>
      result.attendingByMe
        ? 'Presença confirmada! O evento está em "Meus eventos".'
        : 'Participação cancelada.',
  })
  const cancel = useAction(() => repos.events.cancel(event.id), { success: 'Evento cancelado.' })
  const cancelled = event.status === 'cancelled'
  const closed = cancelled || event.isPast

  return (
    <div className="flex flex-col gap-6">
      <MediaCover
        imageUrl={event.imageUrl}
        illustration={event.illustration ?? 'meeting'}
        alt={event.title}
        ratio="16/9"
        className="rounded-card"
      />

      <header className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={event.category} />
          {cancelled && <Badge color="terracotta">Cancelado</Badge>}
          {!cancelled && event.isPast && <Badge color="neutral">Realizado</Badge>}
          {event.isFull && !closed && <Badge color="orange">Lotado</Badge>}
        </div>
        <h2 className="text-ink-900 text-[1.5rem] leading-tight font-extrabold">{event.title}</h2>
      </header>

      <Card className="flex flex-col gap-3">
        <InfoRow icon={CalendarDays}>
          <span className="font-bold first-letter:uppercase">
            {formatWeekdayDate(event.startsAt)}
          </span>
        </InfoRow>
        <InfoRow icon={Clock}>{formatEventTimeRange(event.startsAt, event.endsAt)}</InfoRow>
        <InfoRow icon={MapPin}>
          <span className="font-bold">{event.venue}</span>
          {event.address && <span className="text-ink-500 block text-[13px]">{event.address}</span>}
          <span className="text-ink-500 block text-[13px]">{event.neighborhoodName}</span>
        </InfoRow>
      </Card>

      {/* Participação */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <AvatarGroup people={event.attendeesPreview} total={event.attendeeCount} />
          <p className="text-ink-700 flex-1 text-sm font-semibold">
            <Users className="mr-1 inline size-4" aria-hidden />
            {pluralize(event.attendeeCount, 'pessoa confirmada', 'pessoas confirmadas')}
            {event.capacity ? ` de ${event.capacity} vagas` : ''}
          </p>
        </div>
        {closed ? (
          <p className="text-ink-500 text-sm">
            {cancelled
              ? 'Este evento foi cancelado pelo organizador.'
              : 'Este evento já foi realizado.'}
          </p>
        ) : event.attendingByMe ? (
          <>
            <p className="text-nexa-800 flex items-center gap-1.5 text-sm font-bold">
              <CircleCheck className="size-[18px]" aria-hidden /> Você confirmou presença
            </p>
            <Button variant="outline" loading={attend.pending} onClick={() => void attend.run()}>
              Cancelar participação
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            loading={attend.pending}
            disabled={event.isFull}
            onClick={() => void attend.run()}
          >
            {event.isFull ? 'Evento lotado' : 'Confirmar participação'}
          </Button>
        )}
      </Card>

      <section className="flex flex-col gap-2">
        <SectionHeader title="Sobre o evento" />
        <p className="text-ink-700 text-[15px] leading-relaxed whitespace-pre-line">
          {event.description}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Organização" />
        <Card className="flex items-center gap-3">
          <EntityAvatarView
            entity={event.organizerView.avatar}
            name={event.organizerView.name}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-ink-900 truncate text-[15px] font-bold">
              {event.organizerView.name}
            </p>
            <p className="text-ink-500 text-xs">Organizador</p>
          </div>
          {event.organizerView.to && (
            <Link to={event.organizerView.to} className="text-nexa-800 text-[13px] font-bold">
              Ver perfil
            </Link>
          )}
        </Card>
      </section>

      {event.location && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Como chegar"
            to={paths.mapFocus('events', event.id)}
            actionLabel="Ver no mapa"
          />
          <MapView
            label={`Local de ${event.title}`}
            interactive={false}
            className="rounded-card border-line h-44 border"
            markers={[
              {
                id: event.id,
                location: event.location,
                color: event.category.color,
                icon: event.category.icon,
                title: event.venue,
              },
            ]}
          />
        </section>
      )}

      {event.canManage && !closed && (
        <Card tone="soft" className="flex flex-wrap items-center gap-2">
          <p className="text-ink-800 mr-auto text-sm font-bold">Você gerencia este evento</p>
          <ButtonLink
            to={paths.editEvent(event.id)}
            variant="outline"
            size="sm"
            leftIcon={<Pencil className="size-4" />}
          >
            Editar
          </ButtonLink>
          <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
            Cancelar evento
          </Button>
        </Card>
      )}

      <Callout tone="demo">
        Evento da base demonstrativa — datas, locais e organizadores são fictícios.
      </Callout>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancelar este evento?"
        description="Quem confirmou presença será avisado. Esta ação não pode ser desfeita."
        confirmLabel="Cancelar evento"
        cancelLabel="Voltar"
        tone="danger"
        onConfirm={async () => {
          await cancel.run()
        }}
      />
    </div>
  )
}

/** Detalhes de um evento, com confirmação de participação. */
export default function EventDetailPage() {
  const { id = '' } = useParams()
  const event = useQuery({ queryKey: ['events', id], queryFn: () => repos.events.get(id) })

  const share = async () => {
    if (!event.data) return
    const result = await shareLink({ title: event.data.title, path: paths.event(id) })
    if (result === 'copied') notify.success('Link copiado.')
  }

  return (
    <>
      <PageHeader
        title="Evento"
        variant="stack"
        backTo={paths.events}
        actions={
          <IconButton label="Compartilhar" onClick={share}>
            <Share2 className="size-5" />
          </IconButton>
        }
      />
      <Page>
        <AsyncView
          query={event}
          loading={<Skeleton className="rounded-card aspect-video w-full" />}
          empty={
            <EmptyState
              icon={CalendarDays}
              title="Evento não encontrado"
              action={<ButtonLink to={paths.events}>Ver eventos</ButtonLink>}
            />
          }
        >
          {(item) => item && <EventContent event={item} />}
        </AsyncView>
      </Page>
    </>
  )
}
