import { useQuery } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'

import { paths } from '@/app/paths'
import { NewsCard } from '@/components/domain'
import { AsyncView, Callout, EmptyState, Page, PageHeader } from '@/components/ui'
import { repos } from '@/repositories'

/** Todas as notícias da região. */
export default function NewsListPage() {
  const news = useQuery({ queryKey: ['news', 'all'], queryFn: () => repos.news.list() })
  return (
    <>
      <PageHeader title="Notícias da região" variant="stack" backTo={paths.home} />
      <Page>
        <div className="flex flex-col gap-3">
          <Callout tone="demo">
            Conteúdo editorial demonstrativo: as notícias ilustram o recurso e não relatam fatos
            reais.
          </Callout>
          <AsyncView
            query={news}
            empty={<EmptyState icon={Newspaper} title="Nenhuma notícia por aqui ainda" />}
          >
            {(items) => items.map((article) => <NewsCard key={article.id} article={article} />)}
          </AsyncView>
        </div>
      </Page>
    </>
  )
}
