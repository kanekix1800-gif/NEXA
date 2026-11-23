import { Heart, MapPin, ThumbsUp, Users } from 'lucide-react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { DateBadge, IconTile, MediaCover, Rating } from '@/components/ui'
import type { BusinessView, DemandView, EventView, InstitutionView, NewsArticle } from '@/types'
import { cn } from '@/utils/cn'
import { formatEventTimeRange, timeAgo } from '@/utils/dates'
import { formatDistance } from '@/utils/format'
import { pluralize } from '@/utils/text'

import { DemandStatusBadge } from './badges'

const CARD =
  'rounded-card bg-surface shadow-card hover:shadow-raised flex min-w-0 gap-3.5 p-3.5 transition-[box-shadow,transform] duration-150 active:scale-[0.99]'

/** Cartão de demanda nas listagens. */
export function DemandCard({ demand }: { demand: DemandView }) {
  return (
    <Link to={paths.demand(demand.id)} className={CARD}>
      <IconTile icon={demand.category.icon} color={demand.category.color} size="lg" />
      <div className="min-w-0 flex-1">
        <h3 className="text-ink-900 line-clamp-2 text-[0.9375rem] leading-snug font-bold">
          {demand.title}
        </h3>
        <p className="text-ink-500 mt-0.5 truncate text-xs">
          {demand.category.name} · {demand.neighborhoodName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <DemandStatusBadge status={demand.status} />
          <span className="text-ink-600 inline-flex items-center gap-1 text-xs font-semibold">
            <ThumbsUp className="size-3.5" aria-hidden />
            {pluralize(demand.supportCount, 'apoio', 'apoios')}
          </span>
          <time className="text-ink-400 text-xs" dateTime={demand.createdAt}>
            {timeAgo(demand.createdAt)}
          </time>
        </div>
      </div>
    </Link>
  )
}

/** Cartão de estabelecimento: miniatura, nome, avaliação, situação e distância. */
export function BusinessCard({ business }: { business: BusinessView }) {
  const distance = formatDistance(business.distanceMeters)
  return (
    <Link to={paths.business(business.id)} className={cn(CARD, 'items-center')}>
      <MediaCover
        imageUrl={business.coverUrl}
        illustration={business.illustration}
        alt={business.name}
        ratio="square"
        className="w-20 shrink-0 rounded-2xl"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-ink-900 truncate text-[0.9375rem] font-bold">{business.name}</h3>
        <Rating value={business.rating} count={business.reviewCount} className="mt-0.5" />
        <p className="mt-1 text-xs font-semibold">
          <span className={business.isOpenNow ? 'text-nexa-700' : 'text-ink-400'}>
            {business.isOpenNow ? 'Aberto' : 'Fechado'}
          </span>
          {distance && <span className="text-ink-500"> · {distance}</span>}
          <span className="text-ink-400 font-medium"> · {business.category.name}</span>
        </p>
      </div>
      {business.isFavorite && (
        <Heart
          className="fill-danger-500 text-danger-500 size-[1.125rem] shrink-0"
          aria-label="Favorito"
        />
      )}
    </Link>
  )
}

/** Cartão de evento com selo de data. */
export function EventCard({ event }: { event: EventView }) {
  return (
    <Link to={paths.event(event.id)} className={CARD}>
      <DateBadge date={event.startsAt} />
      <div className="min-w-0 flex-1">
        <h3 className="text-ink-900 line-clamp-2 text-[0.9375rem] leading-snug font-bold">
          {event.title}
        </h3>
        <p className="text-ink-500 mt-0.5 flex items-center gap-1 truncate text-xs">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{event.venue}</span>
        </p>
        <p className="text-ink-500 text-xs">{formatEventTimeRange(event.startsAt, event.endsAt)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
          <span className="text-ink-600 inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {pluralize(event.attendeeCount, 'confirmado', 'confirmados')}
          </span>
          {event.attendingByMe && <span className="text-nexa-700">Você vai</span>}
          {event.status === 'cancelled' && <span className="text-danger-600">Cancelado</span>}
        </div>
      </div>
    </Link>
  )
}

/** Cartão de notícia: miniatura à esquerda, título e data. */
export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Link to={paths.newsArticle(article.id)} className={cn(CARD, 'items-center')}>
      <MediaCover
        illustration={article.illustration}
        alt=""
        ratio="square"
        className="w-[4.5rem] shrink-0 rounded-2xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-nexa-700 text-[0.6875rem] font-bold tracking-wide uppercase">
          {article.tag}
        </p>
        <h3 className="text-ink-900 line-clamp-2 text-[0.9375rem] leading-snug font-bold">
          {article.title}
        </h3>
        <time className="text-ink-500 text-xs" dateTime={article.publishedAt}>
          {timeAgo(article.publishedAt)}
        </time>
      </div>
    </Link>
  )
}

/** Linha de instituição do diretório. */
export function InstitutionRow({ institution }: { institution: InstitutionView }) {
  return (
    <Link
      to={paths.institution(institution.id)}
      className="hover:bg-cream-50 flex items-center gap-3.5 px-4 py-3.5 transition-colors"
    >
      <IconTile icon={institution.icon} color={institution.color} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="text-ink-900 block truncate text-[0.9375rem] font-bold">
          {institution.name}
        </span>
        <span className="text-ink-500 block truncate text-[0.8125rem]">{institution.tagline}</span>
      </span>
    </Link>
  )
}
