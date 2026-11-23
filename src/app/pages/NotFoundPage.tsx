import { Compass } from 'lucide-react'
import { Link } from 'react-router'

import { useAuth } from '@/contexts/AuthContext'

import { paths } from '../paths'

/** Página exibida para rotas inexistentes. */
export function NotFoundPage() {
  const { status } = useAuth()
  const target = status === 'authenticated' ? paths.home : paths.welcome

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-nexa-100 text-nexa-800 flex size-16 items-center justify-center rounded-full">
        <Compass className="size-8" aria-hidden />
      </span>
      <h1 className="text-ink-900 text-xl font-extrabold">Página não encontrada</h1>
      <p className="text-ink-500 text-sm">
        O endereço que você abriu não existe ou foi movido. Que tal voltar e continuar explorando a
        sua comunidade?
      </p>
      <Link
        to={target}
        className="bg-nexa-900 hover:bg-nexa-800 mt-2 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white transition-colors"
      >
        {status === 'authenticated' ? 'Voltar ao início' : 'Ir para a abertura'}
      </Link>
    </main>
  )
}
