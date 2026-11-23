import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'

import { paths } from '@/app/paths'
import { AsyncView, ButtonLink, EmptyState, Page, PageHeader } from '@/components/ui'
import { useCurrentUser } from '@/contexts/AuthContext'
import { PostFeed } from '@/features/community/components/PostFeed'
import { repos } from '@/repositories'

/** Publicações do usuário atual. */
export default function MyPostsPage() {
  const user = useCurrentUser()
  const posts = useQuery({
    queryKey: ['posts', { authorId: user.id }],
    queryFn: () => repos.posts.list({ authorId: user.id }),
  })
  return (
    <>
      <PageHeader title="Minhas Publicações" variant="stack" backTo={paths.profile} />
      <Page>
        <AsyncView
          query={posts}
          empty={
            <EmptyState
              icon={FileText}
              title="Você ainda não publicou"
              description="Compartilhe uma novidade, dúvida ou iniciativa com a comunidade."
              action={<ButtonLink to={paths.newPost()}>Criar publicação</ButtonLink>}
            />
          }
        >
          {(items) => <PostFeed posts={items} />}
        </AsyncView>
      </Page>
    </>
  )
}
