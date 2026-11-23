import { useQuery } from '@tanstack/react-query'
import { Heart } from 'lucide-react'

import { paths } from '@/app/paths'
import { BusinessCard } from '@/components/domain'
import { AsyncView, ButtonLink, EmptyState, Page, PageHeader } from '@/components/ui'
import { repos } from '@/repositories'

/** Estabelecimentos favoritos do usuário. */
export default function MyFavoritesPage() {
  const favorites = useQuery({
    queryKey: ['businesses', { onlyFavorites: true }],
    queryFn: () => repos.businesses.list({ onlyFavorites: true }),
  })
  return (
    <>
      <PageHeader title="Meus Favoritos" variant="stack" backTo={paths.profile} />
      <Page>
        <AsyncView
          query={favorites}
          empty={
            <EmptyState
              icon={Heart}
              title="Nenhum favorito ainda"
              description="Toque no coração na página de um estabelecimento para guardá-lo aqui."
              action={<ButtonLink to={paths.businesses}>Explorar Comércio Local</ButtonLink>}
            />
          }
        >
          {(items) => (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          )}
        </AsyncView>
      </Page>
    </>
  )
}
