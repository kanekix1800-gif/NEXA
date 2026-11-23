import { useQuery } from '@tanstack/react-query'
import { MessagesSquare, PenLine } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router'

import { paths } from '@/app/paths'
import {
  AsyncView,
  ButtonLink,
  EmptyState,
  Fab,
  FilterChips,
  Page,
  PageHeader,
  SearchInput,
} from '@/components/ui'
import { repos } from '@/repositories'
import type { PostCategory } from '@/types'

import { PostFeed } from '../components/PostFeed'

type Filter = PostCategory | 'all'

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'discussion', label: 'Discussões' },
  { value: 'event', label: 'Eventos' },
  { value: 'demand', label: 'Demandas' },
  { value: 'social', label: 'Iniciativas sociais' },
  { value: 'commerce', label: 'Comércio' },
]

/** Feed da comunidade: busca, filtros por categoria e publicações. */
export default function CommunityPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('categoria') as Filter | null
  const category: Filter = FILTERS.some((item) => item.value === requested) ? requested! : 'all'
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const posts = useQuery({
    queryKey: ['posts', { category, search: deferredSearch }],
    queryFn: () => repos.posts.list({ category, search: deferredSearch }),
    placeholderData: (previous) => previous,
  })

  return (
    <>
      <PageHeader title="Comunidade">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar na comunidade…"
          label="Buscar na comunidade"
        />
        <FilterChips
          ariaLabel="Filtrar publicações"
          options={FILTERS}
          value={category}
          onChange={(value) =>
            setParams(value === 'all' ? {} : { categoria: value }, { replace: true })
          }
        />
      </PageHeader>
      <Page>
        <AsyncView
          query={posts}
          empty={
            <EmptyState
              icon={MessagesSquare}
              title={search ? 'Nada encontrado' : 'Nenhuma publicação nesta categoria'}
              description={
                search
                  ? 'Tente outras palavras ou limpe a busca.'
                  : 'Que tal começar a conversa com a sua comunidade?'
              }
              action={<ButtonLink to={paths.newPost()}>Criar publicação</ButtonLink>}
            />
          }
        >
          {(items) => <PostFeed posts={items} />}
        </AsyncView>
      </Page>
      <Fab label="Criar publicação" icon={<PenLine className="size-6" />} to={paths.newPost()} />
    </>
  )
}
