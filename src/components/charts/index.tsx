import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CHART_COLORS, CHART_SEMANTIC } from '@/components/icons/colors'
import { cn } from '@/utils/cn'
import { formatCurrency, formatCurrencyCompact } from '@/utils/format'

/**
 * GRÁFICOS DO NEXA (Recharts)
 * Cartão padrão + gráficos já no estilo da marca. Valores monetários chegam em centavos.
 */

interface ChartCardProps {
  title: string
  subtitle?: string
  /** Mostra uma mensagem no lugar do gráfico quando não há dados. */
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
  className?: string
  /** Altura da área do gráfico (classe Tailwind). */
  height?: string
}

export function ChartCard({
  title,
  subtitle,
  empty,
  emptyMessage = 'Sem dados neste período.',
  children,
  className,
  height = 'h-56',
}: ChartCardProps) {
  return (
    <section className={cn('rounded-card bg-surface shadow-card p-4', className)}>
      <h3 className="text-ink-900 text-[0.9375rem] font-bold">{title}</h3>
      {subtitle && <p className="text-ink-500 text-xs">{subtitle}</p>}
      <div className={cn('mt-3', height)}>
        {empty ? (
          <div className="text-ink-400 flex size-full items-center justify-center text-sm">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

const AXIS = { fontSize: 11, fill: CHART_SEMANTIC.axis }
const TOOLTIP_STYLE = {
  borderRadius: 14,
  border: '1px solid #e9e4d8',
  boxShadow: '0 10px 28px -16px rgb(16 40 32 / 0.3)',
  fontSize: 12,
  fontFamily: 'inherit',
}

const money = (value: unknown) => formatCurrency(Number(value) || 0)

interface SeriesPoint {
  label: string
  [key: string]: string | number
}

/** Evolução de um valor monetário ao longo do tempo (área). */
export function MoneyAreaChart({
  data,
  dataKey,
  name,
}: {
  data: SeriesPoint[]
  dataKey: string
  name: string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="nexa-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CHART_SEMANTIC.income} stopOpacity={0.35} />
            <stop offset="1" stopColor={CHART_SEMANTIC.income} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_SEMANTIC.grid} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={22} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={62}
          tickFormatter={(value) => formatCurrencyCompact(Number(value))}
        />
        <Tooltip formatter={money} contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={CHART_SEMANTIC.income}
          strokeWidth={2.5}
          fill="url(#nexa-area)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Receitas x despesas por período (barras lado a lado). */
export function IncomeExpenseChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 6, left: -8, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={CHART_SEMANTIC.grid} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={18} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={62}
          tickFormatter={(value) => formatCurrencyCompact(Number(value))}
        />
        <Tooltip formatter={money} contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#eef5ec' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="incomeCents"
          name="Receitas"
          fill={CHART_SEMANTIC.income}
          radius={[5, 5, 0, 0]}
          maxBarSize={18}
        />
        <Bar
          dataKey="expenseCents"
          name="Despesas"
          fill={CHART_SEMANTIC.expense}
          radius={[5, 5, 0, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Ranking horizontal (ex.: produtos mais vendidos). */
export function RankingChart({
  data,
  dataKey,
  name,
  formatter = (value) => String(value),
}: {
  data: Array<{ name: string } & Record<string, string | number>>
  dataKey: string
  name: string
  formatter?: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={CHART_SEMANTIC.grid} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={104}
        />
        <Tooltip
          formatter={(value) => formatter(Number(value))}
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#eef5ec' }}
        />
        <Bar dataKey={dataKey} name={name} radius={[0, 6, 6, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Distribuição em rosca com legenda (ex.: despesas por categoria). */
export function DonutChart({
  data,
  format = money,
}: {
  data: Array<{ name: string; value: number }>
  format?: (value: number) => string
}) {
  return (
    <div className="flex size-full items-center gap-3">
      <div className="h-full w-1/2 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => format(Number(value))} contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {data.slice(0, 6).map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              aria-hidden
            />
            <span className="text-ink-600 min-w-0 flex-1 truncate">{entry.name}</span>
            <span className="text-ink-900 font-bold tabular-nums">{format(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Barras verticais simples para contagens (painéis administrativo e institucional). */
export function CountBarChart({
  data,
  name,
}: {
  data: Array<{ label: string; value: number }>
  name: string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
        <CartesianGrid stroke={CHART_SEMANTIC.grid} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#eef5ec' }} />
        <Bar
          dataKey="value"
          name={name}
          fill={CHART_SEMANTIC.income}
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
