import { paths } from '@/app/paths'
import type { BusinessInsight, BusinessSummary } from '@/types'
import { formatChange, formatCurrency, formatQuantity } from '@/utils/format'
import { pluralize } from '@/utils/text'

/**
 * NEXA IA Empresarial (modo demonstrativo)
 * ─────────────────────────────────────────────────────────────────────────────
 * Gera recomendações EXCLUSIVAMENTE a partir do resumo real do estabelecimento
 * (vendas, estoque e lançamentos registrados). Sem dados, não há recomendação:
 * nenhum valor é inventado.
 */
export function buildBusinessInsights(summary: BusinessSummary): BusinessInsight[] {
  const insights: BusinessInsight[] = []
  const days = summary.period.days
  const periodLabel = days === 7 ? 'nesta semana' : `nos últimos ${days} dias`

  if (summary.salesCount === 0 && summary.incomeCents === 0 && summary.expenseCents === 0) {
    return [
      {
        id: 'no_data',
        kind: 'no_data',
        tone: 'neutral',
        title: 'Ainda não há dados suficientes',
        description:
          'Registre vendas e despesas para que a NEXA IA possa analisar o seu negócio. As recomendações são sempre baseadas nos seus próprios registros.',
        action: { label: 'Registrar venda', to: paths.businessNewSale, icon: 'receipt' },
      },
    ]
  }

  const top = summary.topProducts[0]
  if (top) {
    insights.push({
      id: 'top_product',
      kind: 'top_product',
      tone: 'positive',
      title: `Seu produto mais vendido ${periodLabel} foi ${top.name}.`,
      description: `Foram ${formatQuantity(top.quantity)} unidades, somando ${formatCurrency(top.revenueCents)}. Garanta que ele não falte nos horários de maior movimento.`,
      metric: `${formatQuantity(top.quantity)} un`,
      action: { label: 'Ver produtos', to: paths.businessProducts, icon: 'package' },
    })
  }

  if (summary.outOfStock.length > 0) {
    insights.push({
      id: 'out_of_stock',
      kind: 'out_of_stock',
      tone: 'warning',
      title: `${pluralize(summary.outOfStock.length, 'produto está', 'produtos estão')} sem estoque.`,
      description: `Reponha: ${summary.outOfStock
        .slice(0, 4)
        .map((product) => product.name)
        .join(', ')}.`,
      metric: pluralize(summary.outOfStock.length, 'item', 'itens'),
      action: {
        label: 'Repor estoque',
        to: `${paths.businessProducts}?estoque=baixo`,
        icon: 'package',
      },
    })
  }

  if (summary.lowStock.length > 0) {
    insights.push({
      id: 'low_stock',
      kind: 'low_stock',
      tone: 'warning',
      title: `${pluralize(summary.lowStock.length, 'produto está próximo', 'produtos estão próximos')} do estoque mínimo.`,
      description: `${summary.lowStock
        .slice(0, 4)
        .map((product) => `${product.name} (${formatQuantity(product.stock)})`)
        .join(', ')}. Vale programar a reposição.`,
      metric: pluralize(summary.lowStock.length, 'item', 'itens'),
      action: {
        label: 'Ver estoque baixo',
        to: `${paths.businessProducts}?estoque=baixo`,
        icon: 'package',
      },
    })
  }

  const expenseChange = summary.change.expense
  if (expenseChange !== null && Math.abs(expenseChange) >= 0.05) {
    const up = expenseChange > 0
    const biggest = summary.expensesByCategory[0]
    insights.push({
      id: 'expenses_trend',
      kind: 'expenses_trend',
      tone: up ? 'warning' : 'positive',
      title: up
        ? 'Suas despesas aumentaram em relação ao período anterior.'
        : 'Suas despesas diminuíram em relação ao período anterior.',
      description: `Foram ${formatCurrency(summary.expenseCents)} contra ${formatCurrency(summary.previous.expenseCents)} no período anterior (${formatChange(expenseChange)}).${
        biggest ? ` A maior parte foi com ${biggest.label.toLowerCase()}.` : ''
      }`,
      metric: formatChange(expenseChange),
      action: { label: 'Ver finanças', to: paths.businessFinance, icon: 'wallet' },
    })
  }

  const revenueChange = summary.change.revenue
  if (revenueChange !== null && Math.abs(revenueChange) >= 0.03) {
    const up = revenueChange > 0
    insights.push({
      id: 'revenue_trend',
      kind: 'revenue_trend',
      tone: up ? 'positive' : 'warning',
      title: up ? 'Seu faturamento cresceu.' : 'Seu faturamento caiu.',
      description: `${formatCurrency(summary.revenueCents)} ${periodLabel}, ${formatChange(revenueChange)} em relação ao período anterior.`,
      metric: formatChange(revenueChange),
      action: { label: 'Ver vendas', to: paths.businessSales, icon: 'receipt' },
    })
  }

  const fastMovers = summary.topProducts
    .slice(0, 3)
    .filter((item) =>
      [...summary.lowStock, ...summary.outOfStock].some((product) => product.id === item.productId),
    )
  if (summary.topProducts.length > 0) {
    insights.push({
      id: 'restock',
      kind: 'restock',
      tone: fastMovers.length > 0 ? 'warning' : 'neutral',
      title: 'Considere revisar o estoque dos produtos com maior saída.',
      description:
        fastMovers.length > 0
          ? `${fastMovers.map((item) => item.name).join(', ')} ${fastMovers.length === 1 ? 'vende bem e está' : 'vendem bem e estão'} com estoque baixo.`
          : `Os que mais saem são ${summary.topProducts
              .slice(0, 3)
              .map((item) => item.name)
              .join(', ')}. Manter esses itens abastecidos evita perder vendas.`,
      action: { label: 'Ver produtos', to: paths.businessProducts, icon: 'package' },
    })
  }

  if (summary.salesCount > 0) {
    const bestDay = [...summary.salesByDay].sort((a, b) => b.revenueCents - a.revenueCents)[0]
    insights.push({
      id: 'average_ticket',
      kind: 'average_ticket',
      tone: 'neutral',
      title: `Seu ticket médio é de ${formatCurrency(summary.averageTicketCents)}.`,
      description: `${pluralize(summary.salesCount, 'venda', 'vendas')} ${periodLabel}.${
        bestDay && bestDay.revenueCents > 0
          ? ` O melhor dia foi ${bestDay.label}, com ${formatCurrency(bestDay.revenueCents)}.`
          : ''
      } Combos e sugestões no balcão ajudam a aumentar esse valor.`,
      metric: formatCurrency(summary.averageTicketCents),
    })
  }

  const mainPayment = summary.paymentMix[0]
  if (mainPayment && mainPayment.share >= 0.4) {
    insights.push({
      id: 'payment_mix',
      kind: 'payment_mix',
      tone: 'neutral',
      title: `${mainPayment.label} é a forma de pagamento preferida.`,
      description: `Representa ${Math.round(mainPayment.share * 100)}% do valor vendido ${periodLabel}.`,
      metric: `${Math.round(mainPayment.share * 100)}%`,
    })
  }

  return insights
}
