import { Sparkles, TrendingUp, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { paths } from '@/app/paths'
import { ButtonLink, Callout, ErrorState, SegmentedControl, SkeletonList } from '@/components/ui'
import { buildBusinessInsights } from '@/services/ai/businessInsights'
import { PERIOD_PRESET_LABEL, type BusinessView, type PeriodPreset } from '@/types'
import { cn } from '@/utils/cn'

import { BusinessShell } from '../components/BusinessShell'
import { useBusinessData } from '../useBusinessData'

const PERIODS: Array<{ value: PeriodPreset; label: string }> = (['7d', '30d', '90d'] as const).map(
  (value) => ({ value, label: PERIOD_PRESET_LABEL[value] }),
)

function Insights({ business }: { business: BusinessView }) {
  const [period, setPeriod] = useState<PeriodPreset>('7d')
  const { summary, isLoading, error } = useBusinessData(business.id, period)

  if (error) return <ErrorState error={error} />
  if (isLoading || !summary) return <SkeletonList count={4} />
  const insights = buildBusinessInsights(summary)

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-nexa-900 rounded-card flex items-center gap-4 p-5 text-white">
        <span className="bg-white/12 flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Sparkles className="text-sun-300 size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-extrabold">NEXA IA Empresarial</h2>
          <p className="text-[0.8125rem] text-white/75">
            Recomendações geradas a partir das vendas, do estoque e das finanças de {business.name}.
          </p>
        </div>
      </div>

      <SegmentedControl
        ariaLabel="Período analisado"
        options={PERIODS}
        value={period}
        onChange={setPeriod}
        className="self-start"
      />

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {insights.map((insight) => {
          const Icon =
            insight.tone === 'warning'
              ? TriangleAlert
              : insight.tone === 'positive'
                ? TrendingUp
                : Sparkles
          return (
            <li
              key={insight.id}
              className="rounded-card bg-surface shadow-card flex flex-col gap-2 p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                    insight.tone === 'warning' && 'bg-sun-100 text-sun-700',
                    insight.tone === 'positive' && 'bg-nexa-100 text-nexa-800',
                    insight.tone === 'neutral' && 'bg-ink-100 text-ink-600',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-ink-900 text-[0.9375rem] leading-snug font-bold">
                    {insight.title}
                  </h3>
                  <p className="text-ink-600 mt-1 text-[0.8125rem] leading-snug">
                    {insight.description}
                  </p>
                </div>
                {insight.metric && (
                  <span className="text-ink-900 shrink-0 text-sm font-extrabold tabular-nums">
                    {insight.metric}
                  </span>
                )}
              </div>
              {insight.action && (
                <ButtonLink
                  to={insight.action.to}
                  variant="secondary"
                  size="sm"
                  className="self-start"
                >
                  {insight.action.label}
                </ButtonLink>
              )}
            </li>
          )
        })}
      </ul>

      <Callout tone="demo" title="Como estas recomendações são geradas">
        Neste protótipo, as análises usam regras locais sobre os registros do seu negócio. Nenhum
        valor é estimado ou inventado, e os seus dados não saem deste aparelho.
      </Callout>
      <ButtonLink
        to={paths.assistantAsk('Como está o meu negócio?')}
        variant="outline"
        leftIcon={<Sparkles className="size-4" />}
      >
        Conversar com a NEXA IA
      </ButtonLink>
    </div>
  )
}

/** Recomendações da NEXA IA Empresarial, baseadas nos dados do negócio. */
export default function InsightsPage() {
  return <BusinessShell>{(business) => <Insights business={business} />}</BusinessShell>
}
