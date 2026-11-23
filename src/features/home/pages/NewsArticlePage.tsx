import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Newspaper, Share2 } from 'lucide-react'
import { useParams } from 'react-router'

import { paths } from '@/app/paths'
import {
  AsyncView,
  Badge,
  ButtonLink,
  EmptyState,
  IconButton,
  MediaCover,
  notify,
  Page,
  PageHeader,
  Skeleton,
} from '@/components/ui'
import { repos } from '@/repositories'
import { formatDateLong, timeAgo } from '@/utils/dates'
import { shareLink } from '@/utils/share'

/** Detalhes de uma notícia. */
export default function NewsArticlePage() {
  const { id = '' } = useParams()
  const article = useQuery({ queryKey: ['news', id], queryFn: () => repos.news.get(id) })

  const share = async () => {
    if (!article.data) return
    const result = await shareLink({ title: article.data.title, path: paths.newsArticle(id) })
    if (result === 'copied') notify.success('Link copiado.')
  }

  return (
    <>
      <PageHeader
        title="Notícia"
        variant="stack"
        backTo={paths.news}
        actions={
          <IconButton label="Compartilhar" onClick={share}>
            <Share2 className="size-5" />
          </IconButton>
        }
      />
      <Page>
        <AsyncView
          query={article}
          loading={<Skeleton className="rounded-card aspect-video w-full" />}
          empty={
            <EmptyState
              icon={Newspaper}
              title="Notícia não encontrada"
              action={<ButtonLink to={paths.news}>Ver todas as notícias</ButtonLink>}
            />
          }
        >
          {(item) =>
            item && (
              <article className="flex flex-col gap-4">
                <MediaCover
                  illustration={item.illustration}
                  alt=""
                  ratio="16/9"
                  className="rounded-card"
                />
                <div>
                  <Badge>{item.tag}</Badge>
                  <h2 className="text-ink-900 mt-2 text-[1.5rem] leading-tight font-extrabold">
                    {item.title}
                  </h2>
                  <p className="text-ink-500 mt-1.5 text-[0.8125rem]">
                    <time dateTime={item.publishedAt}>
                      {formatDateLong(item.publishedAt)} · {timeAgo(item.publishedAt)}
                    </time>
                  </p>
                </div>
                <p className="text-ink-800 text-base leading-relaxed font-semibold">
                  {item.summary}
                </p>
                {item.body.map((paragraph, index) => (
                  <p key={index} className="text-ink-700 text-[0.9375rem] leading-relaxed">
                    {paragraph}
                  </p>
                ))}
                {item.linkedEventId && (
                  <ButtonLink
                    to={paths.event(item.linkedEventId)}
                    variant="secondary"
                    leftIcon={<CalendarDays className="size-[1.125rem]" />}
                  >
                    Ver evento relacionado
                  </ButtonLink>
                )}
                <p className="text-ink-400 border-line border-t pt-3 text-xs">{item.source}</p>
              </article>
            )
          }
        </AsyncView>
      </Page>
    </>
  )
}
