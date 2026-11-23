import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { ErrorState, SkeletonList } from './feedback'

interface AsyncViewProps<T> {
  query: UseQueryResult<T>
  /** Conteúdo exibido enquanto carrega (padrão: lista de cartões em carregamento). */
  loading?: ReactNode
  /** Conteúdo exibido quando `isEmpty(data)` é verdadeiro. */
  empty?: ReactNode
  /** Por padrão, listas vazias e valores nulos são considerados "vazio". */
  isEmpty?: (data: T) => boolean
  children: (data: T) => ReactNode
}

function defaultIsEmpty(data: unknown): boolean {
  return data === null || data === undefined || (Array.isArray(data) && data.length === 0)
}

/**
 * Trata os estados de uma consulta em um só lugar: carregando, erro (com "tentar
 * novamente"), vazio e conteúdo.
 */
export function AsyncView<T>({ query, loading, empty, isEmpty, children }: AsyncViewProps<T>) {
  if (query.isPending) return <>{loading ?? <SkeletonList />}</>
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  const data = query.data as T
  if (empty !== undefined && (isEmpty ?? defaultIsEmpty)(data)) return <>{empty}</>
  return <>{children(data)}</>
}
