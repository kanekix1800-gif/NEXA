import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Landmark, MapPin, Megaphone, Share2, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'

import { paths } from '@/app/paths'
import { CategoryBadge, DemandStatusBadge, SimulatedBadge, UrgencyBadge } from '@/components/domain'
import { DEMAND_STATUS_COLOR } from '@/components/icons/colors'
import { MapView } from '@/components/map'
import {
  AsyncView,
  Avatar,
  Button,
  ButtonLink,
  Callout,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  IconTile,
  InfoRow,
  MediaCover,
  Modal,
  notify,
  Page,
  PageHeader,
  SectionHeader,
  Select,
  Skeleton,
  Textarea,
  Timeline,
} from '@/components/ui'
import { CommentSection } from '@/features/community/components/CommentSection'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { allowedTransitions } from '@/services/demands/status'
import { DEMAND_STATUS_LABEL, type DemandStatus, type DemandView } from '@/types'
import { cn } from '@/utils/cn'
import { formatDateTime, timeAgo } from '@/utils/dates'
import { shareLink } from '@/utils/share'
import { pluralize } from '@/utils/text'

/** Painel de gestão do status (instituição responsável e administração). */
function ManagePanel({ demand }: { demand: DemandView }) {
  const options = allowedTransitions(demand.status)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<DemandStatus | 'none'>('none')
  const [message, setMessage] = useState('')

  const save = useAction(
    () =>
      status === 'none'
        ? repos.demands.postUpdate(demand.id, message)
        : repos.demands.updateStatus(demand.id, { status, message }),
    {
      success: 'Atualização publicada.',
      onSuccess: () => {
        setOpen(false)
        setMessage('')
        setStatus('none')
      },
    },
  )

  return (
    <>
      <Card tone="soft" className="flex flex-col gap-3">
        <div>
          <p className="text-ink-900 text-[0.9375rem] font-bold">Gestão da demanda</p>
          <p className="text-ink-600 text-[0.8125rem]">
            Publique uma atualização para o morador e os apoiadores.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Atualizar status</Button>
      </Card>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Atualizar demanda"
        description={`${demand.protocol} · status atual: ${DEMAND_STATUS_LABEL[demand.status]}`}
        footer={
          <Button
            fullWidth
            loading={save.pending}
            disabled={message.trim().length < 5}
            onClick={() => void save.run()}
          >
            Publicar atualização
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Novo status">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as DemandStatus | 'none')}
            >
              <option value="none">Manter “{DEMAND_STATUS_LABEL[demand.status]}”</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {DEMAND_STATUS_LABEL[option]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mensagem para a comunidade" hint="Mínimo de 5 caracteres." required>
            <Textarea
              rows={4}
              maxLength={400}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ex.: Equipe técnica agendada para vistoria nesta semana."
            />
          </Field>
          <Callout tone="demo">
            Neste protótipo a atualização é registrada como <strong>simulação</strong>: não
            representa um posicionamento oficial do órgão.
          </Callout>
        </div>
      </Modal>
    </>
  )
}

function DemandContent({ demand }: { demand: DemandView }) {
  const [confirmClose, setConfirmClose] = useState(false)
  const support = useAction(() => repos.demands.toggleSupport(demand.id))
  const close = useAction(() => repos.demands.updateStatus(demand.id, { status: 'closed' }), {
    success: 'Demanda encerrada.',
  })
  const comments = useQuery({
    queryKey: ['demands', demand.id, 'comments'],
    queryFn: () => repos.demands.listComments(demand.id),
  })
  const hasSimulated = demand.history.some((entry) => entry.simulated)
  const closedForSupport = demand.status === 'closed'

  return (
    <div className="flex flex-col gap-6">
      <MediaCover
        imageUrl={demand.photos[0]}
        illustration={demand.illustration ?? 'generic-demand'}
        alt={demand.title}
        ratio="16/9"
        className="rounded-card"
      />

      <header className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <DemandStatusBadge status={demand.status} size="md" />
          <CategoryBadge category={demand.category} />
          <UrgencyBadge urgency={demand.urgency} />
        </div>
        <h2 className="text-ink-900 text-[1.375rem] leading-tight font-extrabold">
          {demand.title}
        </h2>
        <p className="text-ink-500 text-[0.8125rem]">
          Protocolo <strong className="text-ink-700">{demand.protocol}</strong> · registrada{' '}
          {timeAgo(demand.createdAt).toLowerCase()}
        </p>
        <div className="flex items-center gap-2.5">
          <Avatar
            name={demand.author.name}
            avatar={demand.author.avatar}
            photoUrl={demand.author.photoUrl}
            size="sm"
          />
          <p className="text-ink-600 text-[0.8125rem]">
            por{' '}
            <strong className="text-ink-900">{demand.isMine ? 'você' : demand.author.name}</strong>
            {demand.neighborhoodName && ` · ${demand.neighborhoodName}`}
          </p>
        </div>
      </header>

      <p className="text-ink-700 text-[0.9375rem] leading-relaxed whitespace-pre-line">
        {demand.description}
      </p>

      {demand.photos.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {demand.photos.slice(1).map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`Foto ${index + 2} da demanda`}
              className="aspect-square rounded-2xl object-cover"
            />
          ))}
        </div>
      )}

      {/* Apoio da comunidade */}
      <Card className="flex items-center gap-4">
        <IconTile icon={ThumbsUp} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-ink-900 text-lg leading-tight font-extrabold tabular-nums">
            {pluralize(demand.supportCount, 'apoio', 'apoios')}
          </p>
          <p className="text-ink-500 text-xs">
            {demand.isMine
              ? 'Compartilhe para ganhar mais apoios.'
              : 'Quanto mais apoios, mais visível fica o pedido.'}
          </p>
        </div>
        {!demand.isMine && (
          <Button
            variant={demand.supportedByMe ? 'secondary' : 'primary'}
            loading={support.pending}
            disabled={closedForSupport && !demand.supportedByMe}
            onClick={() => void support.run()}
            aria-pressed={demand.supportedByMe}
          >
            {demand.supportedByMe ? 'Apoiando' : 'Apoiar'}
          </Button>
        )}
      </Card>

      {/* Local */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Localização"
          to={demand.location ? paths.mapFocus('demands', demand.id) : undefined}
          actionLabel="Ver no mapa"
        />
        {demand.location ? (
          <MapView
            label="Local aproximado da demanda"
            interactive={false}
            className="rounded-card border-line h-44 border"
            markers={[
              {
                id: demand.id,
                location: demand.location,
                color: demand.category.color,
                icon: demand.category.icon,
                title: demand.title,
              },
            ]}
          />
        ) : (
          <p className="text-ink-500 text-sm">Local não informado no mapa.</p>
        )}
        <InfoRow icon={MapPin}>
          {demand.addressHint || demand.neighborhoodName || 'Sem ponto de referência'}
          <span className="text-ink-400 block text-xs">Localização aproximada</span>
        </InfoRow>
        <InfoRow icon={CalendarDays}>Registrada em {formatDateTime(demand.createdAt)}</InfoRow>
      </section>

      {/* Instituição responsável */}
      {demand.institution && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Instituição responsável" />
          <Card className="flex items-center gap-3.5">
            <IconTile icon={demand.institution.icon} color={demand.institution.color} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-ink-900 truncate text-[0.9375rem] font-bold">
                {demand.institution.name}
              </p>
              <p className="text-ink-500 text-xs">Possível responsável (encaminhamento sugerido)</p>
            </div>
            <ButtonLink to={paths.institution(demand.institution.id)} variant="ghost" size="sm">
              Ver
            </ButtonLink>
          </Card>
        </section>
      )}

      {demand.canManage && <ManagePanel demand={demand} />}

      {/* Histórico */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Histórico de atualizações" />
        {hasSimulated && (
          <Callout tone="demo" icon={Landmark}>
            As atualizações institucionais deste protótipo são <strong>simuladas</strong> e não
            representam confirmação oficial de nenhum órgão público.
          </Callout>
        )}
        <Card>
          <Timeline
            items={demand.history.map((entry) => ({
              id: entry.id,
              title: entry.status ? DEMAND_STATUS_LABEL[entry.status] : 'Atualização',
              description: entry.message,
              date: formatDateTime(entry.createdAt),
              color: entry.status ? DEMAND_STATUS_COLOR[entry.status] : 'gray',
              extra: (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-ink-500 text-xs font-semibold">{entry.actorName}</span>
                  {entry.simulated && <SimulatedBadge />}
                </span>
              ),
            }))}
          />
        </Card>
      </section>

      {demand.canClose && !demand.canManage && demand.isMine && (
        <Button variant="outline" onClick={() => setConfirmClose(true)}>
          Encerrar minha demanda
        </Button>
      )}

      {/* Comentários */}
      <section className={cn('flex flex-col gap-3')}>
        <SectionHeader
          title={
            demand.commentCount > 0
              ? pluralize(demand.commentCount, 'comentário', 'comentários')
              : 'Comentários'
          }
        />
        <CommentSection
          query={comments}
          placeholder="Comente ou traga mais informações…"
          onAdd={(content) => repos.demands.addComment(demand.id, content)}
          onRemove={(commentId) => repos.demands.removeComment(commentId)}
        />
      </section>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Encerrar esta demanda?"
        description="Use esta opção se o problema já foi resolvido ou não existe mais. A demanda fica registrada no histórico."
        confirmLabel="Encerrar"
        onConfirm={async () => {
          await close.run()
        }}
      />
    </div>
  )
}

/** Acompanhamento de uma demanda: status, histórico, apoios, local e comentários. */
export default function DemandDetailPage() {
  const { id = '' } = useParams()
  const demand = useQuery({ queryKey: ['demands', id], queryFn: () => repos.demands.get(id) })

  const share = async () => {
    if (!demand.data) return
    const result = await shareLink({
      title: demand.data.title,
      text: `Apoie esta demanda no NEXA: ${demand.data.title}`,
      path: paths.demand(id),
    })
    if (result === 'copied') notify.success('Link copiado.')
  }

  return (
    <>
      <PageHeader
        title="Demanda"
        variant="stack"
        backTo={paths.demands}
        actions={
          <IconButton label="Compartilhar" onClick={share}>
            <Share2 className="size-5" />
          </IconButton>
        }
      />
      <Page>
        <AsyncView
          query={demand}
          loading={<Skeleton className="rounded-card aspect-video w-full" />}
          empty={
            <EmptyState
              icon={Megaphone}
              title="Demanda não encontrada"
              description="Ela pode ter sido removida."
              action={<ButtonLink to={paths.demands}>Ver demandas</ButtonLink>}
            />
          }
        >
          {(item) => item && <DemandContent demand={item} />}
        </AsyncView>
      </Page>
    </>
  )
}
