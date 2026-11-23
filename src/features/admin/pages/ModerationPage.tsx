import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, Flag, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import {
  AsyncView,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  SegmentedControl,
} from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { POST_CATEGORY_LABEL, REPORT_REASON_LABEL, type PostView, type ReportView } from '@/types'
import { timeAgo } from '@/utils/dates'
import { truncate } from '@/utils/text'

import { AdminShell } from '../components/AdminShell'

type Tab = 'reports' | 'posts'

function Reports() {
  const reports = useQuery({
    queryKey: ['moderation', 'reports'],
    queryFn: () => repos.moderation.listReports({ status: 'all' }),
  })
  const resolve = useAction(
    (report: ReportView, action: 'dismiss' | 'hide' | 'remove') =>
      repos.moderation.resolveReport(report.id, action),
    { success: 'Denúncia resolvida.' },
  )

  return (
    <AsyncView
      query={reports}
      empty={
        <EmptyState
          icon={ShieldCheck}
          title="Nenhuma denúncia"
          description="A comunidade está tranquila por aqui."
        />
      }
    >
      {(items) => (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((report) => (
            <li key={report.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={report.status === 'open' ? 'orange' : 'neutral'}>
                    {report.status === 'open'
                      ? 'Aberta'
                      : report.status === 'dismissed'
                        ? 'Descartada'
                        : 'Resolvida'}
                  </Badge>
                  <Badge color="neutral">
                    {report.targetType === 'post' ? 'Publicação' : 'Comentário'}
                  </Badge>
                  <span className="text-ink-400 ml-auto text-xs">{timeAgo(report.createdAt)}</span>
                </div>
                <p className="text-ink-900 text-sm font-bold">
                  {REPORT_REASON_LABEL[report.reason]}
                </p>
                {report.details && <p className="text-ink-600 text-[13px]">“{report.details}”</p>}
                <blockquote className="bg-cream-100 text-ink-700 rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug">
                  {report.excerpt}
                  {report.targetAuthor && (
                    <span className="text-ink-500 mt-1 block text-xs">
                      — {report.targetAuthor.name}
                    </span>
                  )}
                </blockquote>
                <p className="text-ink-500 text-xs">
                  Denunciado por {report.reporter.name}
                  {report.postId && (
                    <>
                      {' · '}
                      <Link to={paths.post(report.postId)} className="text-nexa-800 font-bold">
                        ver publicação
                      </Link>
                    </>
                  )}
                </p>
                {report.status === 'open' && (
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolve.pending}
                      onClick={() => void resolve.run(report, 'dismiss')}
                    >
                      Manter conteúdo
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<EyeOff className="size-4" />}
                      disabled={resolve.pending}
                      onClick={() => void resolve.run(report, 'hide')}
                    >
                      Ocultar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<Trash2 className="size-4" />}
                      disabled={resolve.pending}
                      onClick={() => void resolve.run(report, 'remove')}
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AsyncView>
  )
}

function Posts() {
  const posts = useQuery({
    queryKey: ['posts', { includeHidden: true }],
    queryFn: () => repos.posts.list({ includeHidden: true }),
  })
  const moderate = useAction(
    (post: PostView) =>
      repos.moderation.setPostModeration(
        post.id,
        post.moderation === 'hidden' ? 'visible' : 'hidden',
      ),
    {
      success: (post) =>
        post.moderation === 'hidden' ? 'Publicação ocultada.' : 'Publicação reexibida.',
    },
  )
  const remove = useAction((post: PostView) => repos.posts.remove(post.id), {
    success: 'Publicação removida.',
  })

  return (
    <AsyncView query={posts} empty={<EmptyState icon={Flag} title="Nenhuma publicação" />}>
      {(items) => (
        <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
          {items.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar
                name={post.author.name}
                avatar={post.author.avatar}
                photoUrl={post.author.photoUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-ink-800 text-sm leading-snug">{truncate(post.content, 110)}</p>
                <p className="text-ink-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
                  {post.byline.name} · {POST_CATEGORY_LABEL[post.category]} ·{' '}
                  {timeAgo(post.createdAt)}
                  {post.moderation === 'hidden' && <Badge color="orange">Oculta</Badge>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={
                    post.moderation === 'hidden' ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )
                  }
                  disabled={moderate.pending}
                  onClick={() => void moderate.run(post)}
                >
                  {post.moderation === 'hidden' ? 'Reexibir' : 'Ocultar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger-600"
                  disabled={remove.pending}
                  onClick={() => void remove.run(post)}
                >
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AsyncView>
  )
}

/** Moderação: revisão de denúncias e controle de publicações. */
export default function ModerationPage() {
  const [tab, setTab] = useState<Tab>('reports')
  return (
    <AdminShell>
      <div className="flex flex-col gap-4">
        <SegmentedControl
          ariaLabel="Tipo de moderação"
          className="self-start"
          options={[
            { value: 'reports', label: 'Denúncias' },
            { value: 'posts', label: 'Publicações' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'reports' ? <Reports /> : <Posts />}
      </div>
    </AdminShell>
  )
}
