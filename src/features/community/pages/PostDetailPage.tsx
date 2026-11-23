import { useQuery } from '@tanstack/react-query'
import { MessagesSquare } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'

import { paths } from '@/app/paths'
import { PostCard } from '@/components/domain'
import { AsyncView, ButtonLink, EmptyState, Page, PageHeader, SectionHeader } from '@/components/ui'
import { repos } from '@/repositories'
import { pluralize } from '@/utils/text'

import { CommentSection } from '../components/CommentSection'
import { usePostActions } from '../components/PostFeed'

/** Detalhes de uma publicação, com comentários. */
export default function PostDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const post = useQuery({ queryKey: ['posts', id], queryFn: () => repos.posts.get(id) })
  const comments = useQuery({
    queryKey: ['posts', id, 'comments'],
    queryFn: () => repos.posts.listComments(id),
    enabled: Boolean(post.data),
  })
  const { cardProps, dialogs } = usePostActions({
    onDeleted: () => navigate(paths.community, { replace: true }),
  })

  return (
    <>
      <PageHeader title="Publicação" variant="stack" backTo={paths.community} />
      <Page>
        <AsyncView
          query={post}
          empty={
            <EmptyState
              icon={MessagesSquare}
              title="Publicação não encontrada"
              description="Ela pode ter sido removida pelo autor ou pela moderação."
              action={<ButtonLink to={paths.community}>Voltar à comunidade</ButtonLink>}
            />
          }
        >
          {(item) =>
            item && (
              <div className="flex flex-col gap-5">
                <PostCard {...cardProps(item)} expanded />
                <SectionHeader
                  title={
                    item.commentCount > 0
                      ? pluralize(item.commentCount, 'comentário', 'comentários')
                      : 'Comentários'
                  }
                />
                <CommentSection
                  query={comments}
                  onAdd={(content) => repos.posts.addComment(id, content)}
                  onRemove={(commentId) => repos.posts.removeComment(commentId)}
                />
              </div>
            )
          }
        </AsyncView>
      </Page>
      {dialogs}
    </>
  )
}
