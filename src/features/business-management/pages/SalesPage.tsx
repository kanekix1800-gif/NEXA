import { useQuery } from '@tanstack/react-query'
import { Plus, Receipt } from 'lucide-react'
import { useState } from 'react'

import { paths } from '@/app/paths'
import { AsyncView, Badge, Button, ButtonLink, EmptyState, Fab } from '@/components/ui'
import { repos } from '@/repositories'
import { PAYMENT_METHOD_LABEL, type BusinessView, type Sale } from '@/types'
import { formatTime, formatWeekdayDate, isSameDay } from '@/utils/dates'
import { formatCurrency, formatQuantity } from '@/utils/format'
import { pluralize } from '@/utils/text'

import { BusinessShell } from '../components/BusinessShell'

/** Quantas vendas aparecem por vez. */
const PAGE_SIZE = 30

/** Agrupa as vendas por dia, mantendo a ordem (mais recentes primeiro). */
function groupByDay(sales: Sale[]): Array<{ day: string; sales: Sale[]; totalCents: number }> {
  const groups: Array<{ day: string; sales: Sale[]; totalCents: number }> = []
  for (const sale of sales) {
    const last = groups[groups.length - 1]
    if (last && isSameDay(last.day, sale.soldAt)) {
      last.sales.push(sale)
      last.totalCents += sale.totalCents
    } else {
      groups.push({ day: sale.soldAt, sales: [sale], totalCents: sale.totalCents })
    }
  }
  return groups
}

function Sales({ business }: { business: BusinessView }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sales = useQuery({
    queryKey: ['business', business.id, 'sales'],
    queryFn: () => repos.sales.list(business.id),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden justify-end lg:flex">
        <ButtonLink to={paths.businessNewSale} leftIcon={<Plus className="size-4" />}>
          Registrar venda
        </ButtonLink>
      </div>
      <AsyncView
        query={sales}
        empty={
          <EmptyState
            icon={Receipt}
            title="Nenhuma venda registrada"
            description="Registre a primeira venda para acompanhar o faturamento e o estoque."
            action={<ButtonLink to={paths.businessNewSale}>Registrar venda</ButtonLink>}
          />
        }
      >
        {(items) => (
          <div className="flex flex-col gap-5">
            {groupByDay(items.slice(0, visible)).map((group) => (
              <section key={group.day}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-ink-800 text-sm font-bold first-letter:uppercase">
                    {formatWeekdayDate(group.day)}
                  </h2>
                  <p className="text-ink-500 text-xs font-semibold">
                    {pluralize(group.sales.length, 'venda', 'vendas')} ·{' '}
                    {formatCurrency(group.totalCents)}
                  </p>
                </div>
                <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
                  {group.sales.map((sale) => (
                    <li key={sale.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-ink-500 w-11 shrink-0 pt-0.5 text-xs font-semibold tabular-nums">
                        {formatTime(sale.soldAt)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink-800 text-sm leading-snug">
                          {sale.items
                            .map((item) => `${formatQuantity(item.quantity)}× ${item.productName}`)
                            .join(', ')}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge color="neutral">{PAYMENT_METHOD_LABEL[sale.paymentMethod]}</Badge>
                          {sale.discountCents > 0 && (
                            <Badge color="orange">
                              Desconto {formatCurrency(sale.discountCents)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-ink-900 text-sm font-extrabold whitespace-nowrap tabular-nums">
                        {formatCurrency(sale.totalCents)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {items.length > visible && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-ink-500 text-xs">
                  Exibindo as {visible} vendas mais recentes de {items.length}.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setVisible((count) => count + PAGE_SIZE)}
                >
                  Mostrar mais vendas
                </Button>
              </div>
            )}
          </div>
        )}
      </AsyncView>
      <div className="lg:hidden">
        <Fab
          label="Registrar venda"
          icon={<Plus className="size-6" />}
          to={paths.businessNewSale}
          extended
        />
      </div>
    </div>
  )
}

/** Histórico de vendas do estabelecimento. */
export default function SalesPage() {
  return <BusinessShell>{(business) => <Sales business={business} />}</BusinessShell>
}
