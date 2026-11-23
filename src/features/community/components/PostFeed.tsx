import { useState, type ReactNode } from 'react'

import { paths } from '@/app/paths'
import { PostCard } from '@/components/domain'
import { ConfirmDialog, Field, Modal, notify, Select, Textarea, Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { can } from '@/services/permissions'
import { REPORT_REASON_LABEL, type PostView, type ReportReason } from '@/types'
import { shareLink } from '@/utils/share'
import { truncate } from '@/utils/text'

/**
 * Interações de uma publicação (curtir, compartilhar, excluir e denunciar), com os
 * diálogos necessários. Usado pelo feed, pelos detalhes e pelas listas do perfil.
 */
export function usePostActions(options: { onDeleted?: () => void } = {}) {
  const { user } = useAuth()
  const [deleting, setDeleting] = useState<PostView | null>(null)
  const [reporting, setReporting] = useState<PostView | null>(null)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')

  const like = useAction((post: PostView) => repos.posts.toggleLike(post.id))
  const remove = useAction((post: PostView) => repos.posts.remove(post.id), {
    success: 'Publicação excluída.',
    onSuccess: options.onDeleted,
  })
  const report = useAction(
    (post: PostView) => repos.posts.report({ type: 'post', id: post.id }, reason, details),
    {
      success: 'Denúncia enviada para revisão. Obrigado por cuidar da comunidade.',
      onSuccess: () => {
        setReporting(null)
        setDetails('')
      },
    },
  )

  const share = async (post: PostView) => {
    const result = await shareLink({
      title: `Publicação de ${post.byline.name} no NEXA`,
      text: truncate(post.content, 120),
      path: paths.post(post.id),
    })
    if (result === 'copied') notify.success('Link copiado.')
    if (result === 'unavailable') notify.info('Não foi possível compartilhar neste aparelho.')
  }

  /** Props prontas para um `PostCard`. */
  const cardProps = (post: PostView) => ({
    post,
    onToggleLike: (target: PostView) => void like.run(target),
    onShare: (target: PostView) => void share(target),
    onDelete: can(user, 'post:delete', { ownerId: post.authorId }) ? setDeleting : undefined,
    onReport: post.isMine ? undefined : setReporting,
  })

  const dialogs: ReactNode = (
    <>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir publicação?"
        description="A publicação e seus comentários serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        tone="danger"
        onConfirm={async () => {
          if (deleting) await remove.run(deleting)
        }}
      />
      <Modal
        open={reporting !== null}
        onOpenChange={(open) => !open && setReporting(null)}
        title="Denunciar publicação"
        description="A denúncia é anônima para o autor e será analisada pela administração."
        size="sm"
        footer={
          <Button
            fullWidth
            loading={report.pending}
            onClick={() => reporting && void report.run(reporting)}
          >
            Enviar denúncia
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Motivo">
            <Select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
            >
              {Object.entries(REPORT_REASON_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Detalhes (opcional)">
            <Textarea
              rows={3}
              maxLength={300}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Conte o que está errado."
            />
          </Field>
        </div>
      </Modal>
    </>
  )

  return { cardProps, dialogs }
}

/** Lista de publicações com todas as interações. */
export function PostFeed({ posts }: { posts: PostView[] }) {
  const { cardProps, dialogs } = usePostActions()
  return (
    <>
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} {...cardProps(post)} />
        ))}
      </div>
      {dialogs}
    </>
  )
}
