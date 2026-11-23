import type { UseQueryResult } from '@tanstack/react-query'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { AsyncView, Avatar, EmptyState, IconButton, SkeletonList } from '@/components/ui'
import { config } from '@/config'
import { useAuth } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { can } from '@/services/permissions'
import type { CommentView } from '@/types'
import { timeAgo } from '@/utils/dates'

interface CommentSectionProps {
  query: UseQueryResult<CommentView[]>
  onAdd: (content: string) => Promise<unknown>
  onRemove: (commentId: string) => Promise<unknown>
  /** Texto do campo (ex.: "Escreva um comentário…"). */
  placeholder?: string
}

/** Lista de comentários com campo para comentar — usada em publicações e demandas. */
export function CommentSection({
  query,
  onAdd,
  onRemove,
  placeholder = 'Escreva um comentário…',
}: CommentSectionProps) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const add = useAction(onAdd, { onSuccess: () => setText('') })
  const remove = useAction(onRemove, { success: 'Comentário removido.' })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (text.trim() !== '') void add.run(text)
  }

  return (
    <section aria-label="Comentários" className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex items-end gap-2">
        {user && (
          <Avatar
            name={user.name}
            avatar={user.avatar}
            photoUrl={user.photoUrl}
            size="sm"
            className="mb-2"
          />
        )}
        <label className="sr-only" htmlFor="novo-comentario">
          Novo comentário
        </label>
        <textarea
          id="novo-comentario"
          rows={1}
          value={text}
          maxLength={config.limits.commentMaxLength}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          className="border-line bg-surface text-ink-900 placeholder:text-ink-400 focus:border-nexa-600 focus:ring-nexa-100 max-h-32 min-h-12 flex-1 resize-none rounded-3xl border px-4 py-3 text-[0.9375rem] outline-none focus:ring-4"
        />
        <IconButton
          type="submit"
          label="Enviar comentário"
          variant="solid"
          disabled={add.pending || text.trim() === ''}
          className="mb-0.5 size-12"
        >
          <Send className="size-5" />
        </IconButton>
      </form>

      <AsyncView
        query={query}
        loading={<SkeletonList count={2} />}
        empty={
          <EmptyState
            icon={MessageCircle}
            title="Ainda não há comentários"
            description="Seja a primeira pessoa a comentar."
            className="py-6"
          />
        }
      >
        {(comments) => (
          <ul className="flex flex-col gap-2.5">
            {comments.map((comment) => (
              <li key={comment.id} className="bg-surface rounded-2xl p-3.5 shadow-card">
                <div className="flex items-start gap-2.5">
                  <Link to={paths.userProfile(comment.author.id)} className="shrink-0">
                    <Avatar
                      name={comment.author.name}
                      avatar={comment.author.avatar}
                      photoUrl={comment.author.photoUrl}
                      size="sm"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem]">
                      <span className="text-ink-900 font-bold">{comment.author.name}</span>{' '}
                      <time className="text-ink-400 text-xs" dateTime={comment.createdAt}>
                        · {timeAgo(comment.createdAt)}
                      </time>
                    </p>
                    <p className="text-ink-700 mt-0.5 text-sm leading-relaxed whitespace-pre-line">
                      {comment.content}
                    </p>
                  </div>
                  {can(user, 'comment:delete', { ownerId: comment.authorId }) && (
                    <IconButton
                      label="Excluir comentário"
                      size="sm"
                      className="-mt-1 -mr-1.5"
                      onClick={() => void remove.run(comment.id)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
    </section>
  )
}
