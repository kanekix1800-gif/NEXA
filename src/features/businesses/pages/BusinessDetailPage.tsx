import { useQuery } from '@tanstack/react-query'
import {
  AtSign,
  ChartColumn,
  Clock,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Share2,
  Star,
  Store,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'

import { paths } from '@/app/paths'
import { CategoryBadge } from '@/components/domain'
import { MapView } from '@/components/map'
import {
  AsyncView,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Callout,
  Card,
  EmptyState,
  Field,
  IconButton,
  InfoRow,
  MediaCover,
  Modal,
  notify,
  Page,
  PageHeader,
  Rating,
  RatingInput,
  SectionHeader,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { config } from '@/config'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { PRODUCT_UNIT_LABEL, WEEKDAY_LABEL, type BusinessView, type CatalogItem } from '@/types'
import { cn } from '@/utils/cn'
import { now } from '@/utils/clock'
import { contactActions, DEMO_CONTACT_NOTICE, type ContactKind } from '@/utils/contact'
import { timeAgo } from '@/utils/dates'
import { formatCurrency, formatDistance } from '@/utils/format'
import { formatDayHours } from '@/utils/schedule'
import { shareLink } from '@/utils/share'

const CONTACT_ICON: Record<ContactKind, LucideIcon> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  instagram: AtSign,
  website: Store,
}

function Catalog({ items }: { items: CatalogItem[] }) {
  const groups = new Map<string, CatalogItem[]>()
  for (const item of items) {
    const key = item.group ?? 'Produtos e serviços'
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([group, groupItems]) => (
        <div key={group}>
          <p className="text-ink-500 mb-1.5 text-xs font-bold tracking-wide uppercase">{group}</p>
          <Card padding="none" className="divide-line divide-y">
            {groupItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 text-sm font-bold">{item.name}</p>
                  {item.description && <p className="text-ink-500 text-xs">{item.description}</p>}
                </div>
                {!item.available && <Badge color="neutral">Indisponível</Badge>}
                <p className="text-ink-900 text-sm font-extrabold whitespace-nowrap tabular-nums">
                  {formatCurrency(item.priceCents)}
                  <span className="text-ink-400 text-[11px] font-medium">
                    {' '}
                    /{PRODUCT_UNIT_LABEL[item.unit]}
                  </span>
                </p>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}

function BusinessContent({ business }: { business: BusinessView }) {
  const [reviewing, setReviewing] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const catalog = useQuery({
    queryKey: ['businesses', business.id, 'catalog'],
    queryFn: () => repos.businesses.listCatalog(business.id),
  })
  const reviews = useQuery({
    queryKey: ['businesses', business.id, 'reviews'],
    queryFn: () => repos.businesses.listReviews(business.id),
  })

  const favorite = useAction(() => repos.businesses.toggleFavorite(business.id), {
    success: (result) =>
      result.isFavorite ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.',
  })
  const saveReview = useAction(
    () => repos.businesses.saveReview(business.id, { rating, comment }),
    {
      success: 'Avaliação registrada. Obrigado!',
      onSuccess: () => setReviewing(false),
    },
  )

  const contacts = contactActions(business)
  const myReview = reviews.data?.find((review) => review.isMine)
  const today = now().getDay()

  const openReview = () => {
    setRating(myReview?.rating ?? 5)
    setComment(myReview?.comment ?? '')
    setReviewing(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <MediaCover
        imageUrl={business.coverUrl}
        illustration={business.illustration}
        alt={business.name}
        ratio="16/9"
        className="rounded-card"
      />

      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-ink-900 text-[1.5rem] leading-tight font-extrabold">
            {business.name}
          </h2>
          <IconButton
            label={business.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            variant="soft"
            aria-pressed={business.isFavorite}
            disabled={favorite.pending}
            onClick={() => void favorite.run()}
          >
            <Heart
              className={cn('size-5', business.isFavorite && 'fill-danger-500 text-danger-500')}
            />
          </IconButton>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CategoryBadge category={business.category} />
          <Rating value={business.rating} count={business.reviewCount} size="md" />
        </div>
        <p className="text-sm font-semibold">
          <span className={business.isOpenNow ? 'text-nexa-700' : 'text-danger-600'}>
            {business.isOpenNow ? 'Aberto agora' : 'Fechado agora'}
          </span>
          <span className="text-ink-500"> · hoje: {formatDayHours(business.todayHours)}</span>
          {business.distanceMeters !== null && (
            <span className="text-ink-500"> · {formatDistance(business.distanceMeters)}</span>
          )}
        </p>
        {business.isDemo && config.isDemoMode && (
          <p className="text-ink-400 text-xs">Estabelecimento fictício da base demonstrativa.</p>
        )}
      </header>

      {business.isMine && (
        <Card tone="soft" className="flex flex-wrap items-center gap-2">
          <p className="text-ink-800 mr-auto text-sm font-bold">Este é o seu estabelecimento</p>
          <ButtonLink
            to={paths.editBusiness(business.id)}
            variant="outline"
            size="sm"
            leftIcon={<Pencil className="size-4" />}
          >
            Editar
          </ButtonLink>
          <ButtonLink
            to={paths.businessDashboard}
            size="sm"
            leftIcon={<ChartColumn className="size-4" />}
          >
            NEXA Business
          </ButtonLink>
        </Card>
      )}

      <p className="text-ink-700 text-[15px] leading-relaxed">{business.description}</p>

      {business.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {business.tags.map((tag) => (
            <Badge key={tag} color="neutral" size="md">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          fullWidth
          size="lg"
          leftIcon={<Phone className="size-5" />}
          onClick={() => setContactOpen(true)}
        >
          Entrar em contato
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Produtos e serviços" />
        <AsyncView
          query={catalog}
          loading={<Skeleton className="rounded-card h-32" />}
          empty={
            <p className="text-ink-500 text-sm">Este estabelecimento ainda não divulgou itens.</p>
          }
        >
          {(items) => <Catalog items={items} />}
        </AsyncView>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Horário de funcionamento" />
        <Card padding="none" className="divide-line divide-y">
          {business.schedule.map((hours, day) => (
            <div
              key={day}
              className={cn(
                'flex items-center justify-between px-4 py-2.5 text-sm',
                day === today && 'bg-nexa-50 font-bold',
              )}
            >
              <span className="text-ink-700 flex items-center gap-2">
                {day === today && <Clock className="text-nexa-800 size-4" aria-hidden />}
                {WEEKDAY_LABEL[day]}
              </span>
              <span className={hours ? 'text-ink-900' : 'text-ink-400'}>
                {formatDayHours(hours)}
              </span>
            </div>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Localização"
          to={paths.mapFocus('businesses', business.id)}
          actionLabel="Ver no mapa"
        />
        <MapView
          label={`Localização de ${business.name}`}
          interactive={false}
          className="rounded-card border-line h-44 border"
          markers={[
            {
              id: business.id,
              location: business.location,
              color: business.category.color,
              icon: business.category.icon,
              title: business.name,
            },
          ]}
        />
        <InfoRow icon={MapPin}>{business.address}</InfoRow>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Avaliações"
          action={
            !business.isMine && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Star className="size-4" />}
                onClick={openReview}
              >
                {myReview ? 'Editar avaliação' : 'Avaliar'}
              </Button>
            )
          }
        />
        <AsyncView
          query={reviews}
          empty={
            <EmptyState
              icon={Star}
              title="Ainda não há avaliações"
              description="Conte como foi a sua experiência."
              className="py-6"
            />
          }
        >
          {(items) => (
            <ul className="flex flex-col gap-2.5">
              {items.map((review) => (
                <li key={review.id} className="bg-surface rounded-2xl p-3.5 shadow-card">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={review.author.name}
                      avatar={review.author.avatar}
                      photoUrl={review.author.photoUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-900 truncate text-[13px] font-bold">
                        {review.isMine ? 'Você' : review.author.name}
                      </p>
                      <p className="text-ink-400 text-xs">{timeAgo(review.createdAt)}</p>
                    </div>
                    <span className="text-ink-900 inline-flex items-center gap-1 text-sm font-extrabold">
                      <Star className="fill-sun-400 text-sun-400 size-4" aria-hidden />
                      {review.rating}
                    </span>
                  </div>
                  <p className="text-ink-700 mt-2 text-sm leading-relaxed">{review.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      </section>

      <Modal
        open={reviewing}
        onOpenChange={setReviewing}
        title={`Avaliar ${business.name}`}
        footer={
          <Button
            fullWidth
            loading={saveReview.pending}
            disabled={comment.trim().length < 3}
            onClick={() => void saveReview.run()}
          >
            Enviar avaliação
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-4">
          <RatingInput value={rating} onChange={setRating} />
          <Field label="Comentário" className="w-full" hint="Mínimo de 3 caracteres." required>
            <Textarea
              rows={4}
              maxLength={config.limits.reviewMaxLength}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Como foi o atendimento? O que você recomenda?"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={contactOpen}
        onOpenChange={setContactOpen}
        title="Contato"
        description={business.name}
        size="sm"
      >
        <div className="flex flex-col gap-2.5">
          {business.isDemo && <Callout tone="demo">{DEMO_CONTACT_NOTICE}</Callout>}
          {contacts.map((contact) => {
            const Icon = CONTACT_ICON[contact.kind]
            const content = (
              <>
                <span className="bg-nexa-50 text-nexa-900 flex size-11 shrink-0 items-center justify-center rounded-2xl">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="text-ink-900 block text-sm font-bold">{contact.label}</span>
                  <span className="text-ink-500 block truncate text-[13px]">{contact.value}</span>
                </span>
              </>
            )
            const className =
              'bg-surface shadow-card flex w-full items-center gap-3 rounded-2xl p-3'
            return contact.href ? (
              <a
                key={contact.kind}
                href={contact.href}
                target="_blank"
                rel="noreferrer"
                className={className}
              >
                {content}
              </a>
            ) : (
              <button
                key={contact.kind}
                type="button"
                className={className}
                onClick={() =>
                  notify.info(
                    'Contato demonstrativo',
                    'Este número é fictício e não realiza chamadas.',
                  )
                }
              >
                {content}
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}

/** Página do estabelecimento: informações, catálogo, horários, contato, local e avaliações. */
export default function BusinessDetailPage() {
  const { id = '' } = useParams()
  const business = useQuery({
    queryKey: ['businesses', id],
    queryFn: () => repos.businesses.get(id),
  })

  const share = async () => {
    if (!business.data) return
    const result = await shareLink({ title: business.data.name, path: paths.business(id) })
    if (result === 'copied') notify.success('Link copiado.')
  }

  return (
    <>
      <PageHeader
        title="Estabelecimento"
        variant="stack"
        backTo={paths.businesses}
        actions={
          <IconButton label="Compartilhar" onClick={share}>
            <Share2 className="size-5" />
          </IconButton>
        }
      />
      <Page>
        <AsyncView
          query={business}
          loading={<Skeleton className="rounded-card aspect-video w-full" />}
          empty={
            <EmptyState
              icon={Store}
              title="Estabelecimento não encontrado"
              action={<ButtonLink to={paths.businesses}>Ver comércio local</ButtonLink>}
            />
          }
        >
          {(item) => item && <BusinessContent business={item} />}
        </AsyncView>
      </Page>
    </>
  )
}
