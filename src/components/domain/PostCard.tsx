import {
  CalendarDays,
  EllipsisVertical,
  Flag,
  Heart,
  Megaphone,
  MessageCircle,
  Share2,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { ActionMenu, Badge, EntityAvatarView, IconButton, MediaCover } from '@/components/ui'
import { POST_CATEGORY_LABEL, type PostView } from '@/types'
import { cn } from '@/utils/cn'
import { timeAgo } from '@/utils/dates'

interface PostCardProps {
  post: PostView
  onToggleLike: (post: PostView) => void
  onShare: (post: PostView) => void
  /** Excluir (exibido para o autor e para a administração). */
  onDelete?: (post: PostView) => void
  /** Denunciar (exibido para os demais). */
  onReport?: (post: PostView) => void
  /** Mostra o texto completo (tela de detalhes) em vez de limitar as linhas. */
  expanded?: boolean
}

/** Cartão de publicação do feed comunitário. */
export function PostCard({
  post,
  onToggleLike,
  onShare,
  onDelete,
  onReport,
  expanded,
}: PostCardProps) {
  const menu = [
    ...(onDelete
      ? [
          {
            label: 'Excluir publicação',
            icon: <Trash2 className="size-4" />,
            onSelect: () => onDelete(post),
            tone: 'danger' as const,
          },
        ]
      : []),
    ...(onReport
      ? [{ label: 'Denunciar', icon: <Flag className="size-4" />, onSelect: () => onReport(post) }]
      : []),
  ]
  const detail = paths.post(post.id)

  return (
    <article className="rounded-card bg-surface shadow-card p-4">
      <header className="flex items-start gap-3">
        <EntityAvatarView entity={post.byline.avatar} name={post.byline.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {post.byline.to ? (
              <Link
                to={post.byline.to}
                className="text-ink-900 truncate text-[0.9375rem] font-bold"
              >
                {post.byline.name}
              </Link>
            ) : (
              <span className="text-ink-900 truncate text-[0.9375rem] font-bold">
                {post.byline.name}
              </span>
            )}
            {post.byline.kind !== 'user' && (
              <Badge color={post.byline.kind === 'institution' ? 'teal' : 'orange'}>
                {post.byline.kind === 'institution' ? 'Instituição' : 'Comércio'}
              </Badge>
            )}
          </div>
          <p className="text-ink-500 text-xs">
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            {' · '}
            {post.neighborhoodName || POST_CATEGORY_LABEL[post.category]}
          </p>
        </div>
        {menu.length > 0 && (
          <ActionMenu
            label="Opções da publicação"
            actions={menu}
            trigger={
              <IconButton label="Opções da publicação" size="sm" className="-mt-1 -mr-2">
                <EllipsisVertical className="size-[1.125rem]" />
              </IconButton>
            }
          />
        )}
      </header>

      {post.moderation === 'hidden' && (
        <p className="bg-sun-50 text-sun-800 mt-3 rounded-xl px-3 py-2 text-xs font-semibold">
          Publicação ocultada pela moderação — visível apenas para você e para a administração.
        </p>
      )}

      <Link to={detail} className="mt-3 block" aria-label="Abrir publicação">
        <p
          className={cn(
            'text-ink-800 text-[0.9375rem] leading-relaxed whitespace-pre-line',
            !expanded && 'line-clamp-5',
          )}
        >
          {post.content}
        </p>
        {(post.imageUrl || post.illustration) && (
          <MediaCover
            imageUrl={post.imageUrl}
            illustration={post.illustration}
            alt="Imagem da publicação"
            ratio="16/9"
            className="mt-3 rounded-2xl"
          />
        )}
      </Link>

      {post.linkedDemand && (
        <Link
          to={paths.demand(post.linkedDemand.id)}
          className="bg-nexa-50 hover:bg-nexa-100 mt-3 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-colors"
        >
          <Megaphone className="text-nexa-800 size-[1.125rem] shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="text-ink-900 block truncate text-[0.8125rem] font-bold">
              {post.linkedDemand.title}
            </span>
            <span className="text-ink-500 block text-[0.6875rem]">
              Demanda {post.linkedDemand.protocol} · toque para acompanhar
            </span>
          </span>
        </Link>
      )}
      {post.linkedEvent && (
        <Link
          to={paths.event(post.linkedEvent.id)}
          className="bg-sun-50 hover:bg-sun-100 mt-3 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-colors"
        >
          <CalendarDays className="text-sun-700 size-[1.125rem] shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="text-ink-900 block truncate text-[0.8125rem] font-bold">
              {post.linkedEvent.title}
            </span>
            <span className="text-ink-500 block text-[0.6875rem]">
              Evento · toque para ver detalhes
            </span>
          </span>
        </Link>
      )}

      <footer className="text-ink-600 mt-3 flex items-center gap-1 text-[0.8125rem] font-semibold">
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          aria-pressed={post.likedByMe}
          aria-label={post.likedByMe ? 'Descurtir' : 'Curtir'}
          className={cn(
            'hover:bg-cream-100 -ml-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 transition-[background-color,transform] active:scale-95',
            post.likedByMe && 'text-danger-600',
          )}
        >
          <Heart className={cn('size-5', post.likedByMe && 'fill-current')} aria-hidden />
          <span className="tabular-nums">{post.likeCount}</span>
        </button>
        <Link
          to={detail}
          aria-label={`${post.commentCount} comentários`}
          className="hover:bg-cream-100 inline-flex h-10 items-center gap-1.5 rounded-full px-2.5"
        >
          <MessageCircle className="size-5" aria-hidden />
          <span className="tabular-nums">{post.commentCount}</span>
        </Link>
        <button
          type="button"
          onClick={() => onShare(post)}
          aria-label="Compartilhar"
          className="hover:bg-cream-100 -mr-2 ml-auto inline-flex size-10 items-center justify-center rounded-full"
        >
          <Share2 className="size-5" aria-hidden />
        </button>
      </footer>
    </article>
  )
}
