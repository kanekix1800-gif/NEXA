import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { repos } from '@/repositories'
import { computeBusinessSummary } from '@/services/business/metrics'
import type { BusinessSummary, PeriodPreset } from '@/types'
import { rangeForPreset } from '@/utils/dates'

/** Estabelecimento do comerciante atual. */
export function useMyBusiness() {
  return useQuery({ queryKey: ['businesses', 'mine'], queryFn: () => repos.businesses.getMine() })
}

/**
 * Dados de gestão do estabelecimento (produtos, vendas e lançamentos) e o resumo do
 * período, calculado por funções puras a partir dos registros do próprio negócio.
 */
export function useBusinessData(businessId: string | undefined, period: PeriodPreset) {
  const enabled = Boolean(businessId)
  const id = businessId ?? ''
  const products = useQuery({
    queryKey: ['business', id, 'products'],
    queryFn: () => repos.products.list(id, { includeInactive: true }),
    enabled,
  })
  const sales = useQuery({
    queryKey: ['business', id, 'sales'],
    queryFn: () => repos.sales.list(id),
    enabled,
  })
  const transactions = useQuery({
    queryKey: ['business', id, 'transactions'],
    queryFn: () => repos.transactions.list(id),
    enabled,
  })

  const summary = useMemo<BusinessSummary | null>(() => {
    if (!products.data || !sales.data || !transactions.data) return null
    return computeBusinessSummary({
      products: products.data,
      sales: sales.data,
      transactions: transactions.data,
      range: rangeForPreset(period),
    })
  }, [products.data, sales.data, transactions.data, period])

  return {
    products,
    sales,
    transactions,
    summary,
    isLoading: products.isLoading || sales.isLoading || transactions.isLoading,
    error: products.error ?? sales.error ?? transactions.error,
  }
}
