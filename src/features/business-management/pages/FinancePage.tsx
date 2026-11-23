import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'

import { ChartCard, IncomeExpenseChart } from '@/components/charts'
import {
  Badge,
  Button,
  CurrencyInput,
  EmptyState,
  ErrorState,
  Field,
  FilterChips,
  IconButton,
  Input,
  Modal,
  SegmentedControl,
  Select,
  Skeleton,
  StatCard,
} from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PERIOD_PRESET_LABEL,
  TRANSACTION_CATEGORY_LABEL,
  type BusinessView,
  type PeriodPreset,
  type TransactionCategory,
  type TransactionType,
} from '@/types'
import { cn } from '@/utils/cn'
import { now } from '@/utils/clock'
import {
  formatDate,
  fromDateInputValue,
  isWithinRange,
  rangeForPreset,
  toDateInputValue,
} from '@/utils/dates'
import { isAppError } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'

import { BusinessShell } from '../components/BusinessShell'
import { useBusinessData } from '../useBusinessData'

const PERIODS: Array<{ value: PeriodPreset; label: string }> = (['7d', '30d', '90d'] as const).map(
  (value) => ({ value, label: PERIOD_PRESET_LABEL[value] }),
)
type TypeFilter = TransactionType | 'all'

function TransactionForm({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const [type, setType] = useState<TransactionType>('expense')
  const [category, setCategory] = useState<TransactionCategory>('suppliers')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [date, setDate] = useState(toDateInputValue(now()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const save = useAction(
    () =>
      repos.transactions.create(businessId, {
        type,
        category,
        description,
        amountCents: amount ?? 0,
        date: fromDateInputValue(date) ?? now().toISOString(),
      }),
    {
      success: 'Lançamento registrado.',
      onSuccess: onClose,
      onError: (error) => {
        if (isAppError(error) && error.fieldErrors) setErrors(error.fieldErrors)
      },
    },
  )

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Novo lançamento"
      footer={
        <Button fullWidth loading={save.pending} onClick={() => void save.run()}>
          Registrar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl
          ariaLabel="Tipo de lançamento"
          className="w-full"
          options={[
            { value: 'expense', label: 'Despesa' },
            { value: 'income', label: 'Receita' },
          ]}
          value={type}
          onChange={(value) => {
            setType(value)
            setCategory(value === 'income' ? 'other_income' : 'suppliers')
          }}
        />
        <Field label="Categoria" error={errors.category}>
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value as TransactionCategory)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {TRANSACTION_CATEGORY_LABEL[item]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição" error={errors.description} required>
          <Input
            value={description}
            maxLength={120}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: Compra de farinha"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" error={errors.amountCents} required>
            <CurrencyInput value={amount} onValueChange={setAmount} />
          </Field>
          <Field label="Data" error={errors.date} required>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

function Finance({ business }: { business: BusinessView }) {
  const [period, setPeriod] = useState<PeriodPreset>('30d')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [adding, setAdding] = useState(false)
  const [limit, setLimit] = useState(25)
  const { summary, transactions, isLoading, error } = useBusinessData(business.id, period)
  const remove = useAction((id: string) => repos.transactions.remove(id), {
    success: 'Lançamento removido.',
  })

  if (error) return <ErrorState error={error} />
  if (isLoading || !summary) return <Skeleton className="rounded-card h-64" />

  const range = rangeForPreset(period)
  const entries = (transactions.data ?? []).filter(
    (entry) =>
      isWithinRange(entry.date, range) && (typeFilter === 'all' || entry.type === typeFilter),
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="Período"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />
        <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
          Novo lançamento
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Receitas"
          value={formatCurrency(summary.incomeCents)}
          icon={ArrowUpRight}
          color="green"
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(summary.expenseCents)}
          icon={ArrowDownRight}
          color="orange"
          change={summary.change.expense}
          invertChange
        />
        <StatCard
          label="Saldo do período"
          value={formatCurrency(summary.profitCents)}
          icon={Wallet}
          color={summary.profitCents >= 0 ? 'teal' : 'terracotta'}
          hint="receitas − despesas"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <ChartCard
        title="Fluxo de caixa"
        subtitle="Receitas e despesas do período"
        empty={summary.incomeCents === 0 && summary.expenseCents === 0}
      >
        <IncomeExpenseChart data={summary.cashFlow.map((point) => ({ ...point }))} />
      </ChartCard>

      <section className="flex flex-col gap-3">
        <FilterChips
          ariaLabel="Filtrar lançamentos"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'income', label: 'Receitas' },
            { value: 'expense', label: 'Despesas' },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        {entries.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhum lançamento neste período" className="py-8" />
        ) : (
          <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
            {entries.slice(0, limit).map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    entry.type === 'income' ? 'bg-nexa-50 text-nexa-800' : 'bg-sun-50 text-sun-700',
                  )}
                >
                  {entry.type === 'income' ? (
                    <ArrowUpRight className="size-4" />
                  ) : (
                    <ArrowDownRight className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 truncate text-sm font-semibold">{entry.description}</p>
                  <p className="text-ink-500 flex flex-wrap items-center gap-x-1.5 text-xs">
                    {formatDate(entry.date)} · {TRANSACTION_CATEGORY_LABEL[entry.category]}
                    {entry.saleId && <Badge color="neutral">Venda</Badge>}
                  </p>
                </div>
                <p
                  className={cn(
                    'text-sm font-extrabold whitespace-nowrap tabular-nums',
                    entry.type === 'income' ? 'text-nexa-800' : 'text-ink-900',
                  )}
                >
                  {entry.type === 'income' ? '+' : '−'} {formatCurrency(entry.amountCents)}
                </p>
                {!entry.saleId && (
                  <IconButton
                    label="Remover lançamento"
                    size="sm"
                    onClick={() => void remove.run(entry.id)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
        {entries.length > limit && (
          <Button variant="ghost" onClick={() => setLimit(limit + 50)}>
            Mostrar mais lançamentos ({entries.length - limit} restantes)
          </Button>
        )}
      </section>

      {adding && <TransactionForm businessId={business.id} onClose={() => setAdding(false)} />}
    </div>
  )
}

/** Gestão financeira: receitas, despesas, fluxo de caixa e histórico. */
export default function FinancePage() {
  return <BusinessShell>{(business) => <Finance business={business} />}</BusinessShell>
}
