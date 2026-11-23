import { useQuery } from '@tanstack/react-query'
import { MapPin, MessagesSquare, UserRound } from 'lucide-react'
import { useParams } from 'react-router'

import { paths } from '@/app/paths'
import {
  AsyncView,
  Avatar,
  Badge,
  ButtonLink,
  EmptyState,
  Page,
  PageHeader,
  SectionHeader,
} from '@/components/ui'
import { repos } from '@/repositories'
import { USER_ROLE_LABEL } from '@/types'

import { PostFeed } from '../components/PostFeed'

/** Perfil público de uma pessoa (sem dados de contato) e suas publicações. */
export default function UserProfilePage() {
  const { id = '' } = useParams()
  const profile = useQuery({
    queryKey: ['users', 'public', id],
    queryFn: () => repos.users.getPublicProfile(id),
  })
  const posts = useQuery({
    queryKey: ['posts', { authorId: id }],
    queryFn: () => repos.posts.list({ authorId: id }),
    enabled: Boolean(profile.data),
  })

  return (
    <>
      <PageHeader title="Perfil" variant="stack" backTo={paths.community} />
      <Page>
        <AsyncView
          query={profile}
          empty={
            <EmptyState
              icon={UserRound}
              title="Perfil não encontrado"
              description="Esta pessoa não faz mais parte do NEXA."
              action={<ButtonLink to={paths.community}>Voltar à comunidade</ButtonLink>}
            />
          }
        >
          {(person) =>
            person && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 pt-2 text-center">
                  <Avatar
                    name={person.name}
                    avatar={person.avatar}
                    photoUrl={person.photoUrl}
                    size="2xl"
                  />
                  <h2 className="text-ink-900 text-xl font-extrabold">{person.name}</h2>
                  <p className="text-ink-500 -mt-1 text-sm">@{person.username}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge>{USER_ROLE_LABEL[person.role]}</Badge>
                    {person.neighborhoodName && (
                      <span className="text-ink-600 inline-flex items-center gap-1 text-xs font-semibold">
                        <MapPin className="size-3.5" aria-hidden />
                        {person.neighborhoodName}
                      </span>
                    )}
                  </div>
                  {person.bio && <p className="text-ink-600 max-w-sm text-sm">{person.bio}</p>}
                </div>

                <section className="flex flex-col gap-3">
                  <SectionHeader title="Publicações" />
                  <AsyncView
                    query={posts}
                    empty={
                      <EmptyState
                        icon={MessagesSquare}
                        title="Nenhuma publicação ainda"
                        className="py-6"
                      />
                    }
                  >
                    {(items) => <PostFeed posts={items} />}
                  </AsyncView>
                </section>
              </div>
            )
          }
        </AsyncView>
      </Page>
    </>
  )
}
