import { Package, Plus, Receipt, Sparkles, TrendingUp, TriangleAlert, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import {
  ChartCard,
  DonutChart,
  IncomeExpenseChart,
  MoneyAreaChart,
  RankingChart,
} from '@/components/charts'
import {
  ButtonLink,
  Callout,
  ErrorState,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  StatCard,
} from '@/components/ui'
import { buildBusinessInsights } from '@/services/ai/businessInsights'
import { PERIOD_PRESET_LABEL, type BusinessView, type PeriodPreset } from '@/types'
import { formatCurrency, formatQuantity } from '@/utils/format'

import { BusinessShell } from '../components/BusinessShell'
import { useBusinessData } from '../useBusinessData'

const PERIODS: Array<{ value: PeriodPreset; label: string }> = (['7d', '30d', '90d'] as const).map(
  (value) => ({ value, label: PERIOD_PRESET_LABEL[value] }),
)

function Dashboard({ business }: { business: BusinessView }) {
  const [period, setPeriod] = useState<PeriodPreset>('30d')
  const { summary, isLoading, error } = useBusinessData(business.id, period)

  if (error) return <ErrorState error={error} />
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="rounded-card h-28" />
        ))}
      </div>
    )
  }

  const insights = buildBusinessInsights(summary).slice(0, 2)
  const comparison = `vs. ${PERIOD_PRESET_LABEL[period]} anteriores`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="Período"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />
        <div className="flex gap-2">
          <ButtonLink to={paths.businessNewSale} size="sm" leftIcon={<Plus className="size-4" />}>
            Registrar venda
          </ButtonLink>
          <ButtonLink to={`${paths.businessProducts}?novo=1`} size="sm" variant="secondary">
            Novo produto
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Faturamento"
          value={formatCurrency(summary.revenueCents)}
          icon={TrendingUp}
          change={summary.change.revenue}
          hint={comparison}
        />
        <StatCard
          label="Vendas realizadas"
          value={summary.salesCount}
          icon={Receipt}
          color="teal"
          change={summary.change.salesCount}
          hint={`ticket médio ${formatCurrency(summary.averageTicketCents)}`}
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(summary.expenseCents)}
          icon={Wallet}
          color="orange"
          change={summary.change.expense}
          invertChange
          hint={comparison}
        />
        <StatCard
          label="Lucro estimado"
          value={formatCurrency(summary.profitCents)}
          icon="chart"
          color="green"
          change={summary.change.profit}
          hint="receitas − despesas"
        />
        <StatCard
          label="Produtos em estoque"
          value={summary.stockedProducts}
          icon={Package}
          color="blue"
          hint={`${formatQuantity(summary.stockUnits)} unidades`}
          to={paths.businessProducts}
        />
        <StatCard
          label="Estoque baixo"
          value={summary.lowStock.length + summary.outOfStock.length}
          icon={TriangleAlert}
          color="terracotta"
          hint={
            summary.lowStock.length + summary.outOfStock.length > 0
              ? 'precisam de reposição'
              : 'tudo em dia'
          }
          to={`${paths.businessProducts}?estoque=baixo`}
        />
      </div>

      {insights.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="NEXA IA Empresarial"
            to={paths.businessInsights}
            actionLabel="Ver todas"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {insights.map((insight) => (
              <Callout
                key={insight.id}
                tone={insight.tone === 'warning' ? 'warning' : 'ai'}
                icon={Sparkles}
                title={insight.title}
              >
                {insight.description}
                {insight.action && (
                  <Link
                    to={insight.action.to}
                    className="mt-1 block font-bold underline underline-offset-2"
                  >
                    {insight.action.label}
                  </Link>
                )}
              </Callout>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Evolução das vendas"
          subtitle="Faturamento por dia"
          empty={summary.salesCount === 0}
        >
          <MoneyAreaChart
            data={summary.salesByDay.map((point) => ({ ...point }))}
            dataKey="revenueCents"
            name="Faturamento"
          />
        </ChartCard>
        <ChartCard
          title="Receitas e despesas"
          subtitle="Fluxo do período"
          empty={summary.incomeCents === 0 && summary.expenseCents === 0}
        >
          <IncomeExpenseChart data={summary.cashFlow.map((point) => ({ ...point }))} />
        </ChartCard>
        <ChartCard
          title="Produtos mais vendidos"
          subtitle="Quantidade vendida"
          empty={summary.topProducts.length === 0}
        >
          <RankingChart
            data={summary.topProducts.map((item) => ({ name: item.name, quantity: item.quantity }))}
            dataKey="quantity"
            name="Quantidade"
            formatter={(value) => `${formatQuantity(value)} un`}
          />
        </ChartCard>
        <ChartCard
          title="Distribuição de despesas"
          subtitle="Por categoria"
          empty={summary.expensesByCategory.length === 0}
        >
          <DonutChart
            data={summary.expensesByCategory.map((slice) => ({
              name: slice.label,
              value: slice.amountCents,
            }))}
          />
        </ChartCard>
      </div>
    </div>
  )
}

/** Painel do comerciante: indicadores, gráficos e recomendações. */
export default function BusinessDashboardPage() {
  return <BusinessShell>{(business) => <Dashboard business={business} />}</BusinessShell>
}
