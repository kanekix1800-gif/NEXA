import { useQuery } from '@tanstack/react-query'
import { CircleCheck, Package, Store } from 'lucide-react'
import { useMemo, useState } from 'react'

import { paths } from '@/app/paths'
import {
  AsyncView,
  Badge,
  Button,
  ButtonLink,
  Callout,
  CurrencyInput,
  EmptyState,
  Field,
  FilterChips,
  Input,
  Page,
  PageHeader,
  QuantityStepper,
  SearchInput,
  SkeletonList,
  StickyActionBar,
} from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { isWholeUnit, lineTotalCents } from '@/services/business/sales'
import { PAYMENT_METHOD_LABEL, type PaymentMethod, type Product, type Sale } from '@/types'
import { cn } from '@/utils/cn'
import { isAppError, toUserMessage } from '@/utils/errors'
import { formatCurrency, formatQuantity } from '@/utils/format'
import { matchesSearch, pluralize } from '@/utils/text'

import { useMyBusiness } from '../useBusinessData'

const PAYMENTS: Array<{ value: PaymentMethod; label: string }> = (
  ['pix', 'cash', 'debit_card', 'credit_card', 'other'] as const
).map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] }))

function SaleForm({
  businessId,
  allowNegativeStock,
}: {
  businessId: string
  allowNegativeStock: boolean
}) {
  const products = useQuery({
    queryKey: ['business', businessId, 'products', 'active'],
    queryFn: () => repos.products.list(businessId),
  })
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [payment, setPayment] = useState<PaymentMethod>('pix')
  const [discount, setDiscount] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [stockError, setStockError] = useState<string | null>(null)
  const [done, setDone] = useState<Sale | null>(null)

  const lines = useMemo(
    () =>
      (products.data ?? [])
        .filter((product) => (cart[product.id] ?? 0) > 0)
        .map((product) => ({
          product,
          quantity: cart[product.id] ?? 0,
          totalCents: lineTotalCents(cart[product.id] ?? 0, product.priceCents),
        })),
    [products.data, cart],
  )
  const subtotal = lines.reduce((sum, line) => sum + line.totalCents, 0)
  const discountCents = Math.min(discount ?? 0, subtotal)
  const total = subtotal - discountCents

  const register = useAction(
    () =>
      repos.sales.register(businessId, {
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        paymentMethod: payment,
        discountCents,
        note: note || undefined,
      }),
    {
      silentError: true,
      onSuccess: setDone,
      onError: (error) =>
        setStockError(
          isAppError(error) && error.code === 'insufficient_stock'
            ? error.message
            : toUserMessage(error),
        ),
    },
  )

  if (done) {
    return (
      <Page bottomNav={false} width="narrow">
        <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
          <span className="bg-nexa-100 text-nexa-800 flex size-20 items-center justify-center rounded-full">
            <CircleCheck className="size-10" aria-hidden />
          </span>
          <h2 className="text-ink-900 text-2xl font-extrabold">Venda registrada!</h2>
          <p className="text-ink-600 text-[0.9375rem]">
            {formatCurrency(done.totalCents)} em {PAYMENT_METHOD_LABEL[done.paymentMethod]} ·{' '}
            {pluralize(done.items.length, 'item', 'itens')}. O estoque e o financeiro já foram
            atualizados.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Button
              size="lg"
              fullWidth
              onClick={() => {
                setDone(null)
                setCart({})
                setDiscount(null)
                setNote('')
              }}
            >
              Registrar outra venda
            </Button>
            <ButtonLink to={paths.businessDashboard} size="lg" variant="secondary" fullWidth>
              Ver painel atualizado
            </ButtonLink>
            <ButtonLink to={paths.businessProducts} variant="ghost" fullWidth>
              Conferir estoque
            </ButtonLink>
          </div>
        </div>
      </Page>
    )
  }

  const setQuantity = (product: Product, quantity: number) => {
    setStockError(null)
    setCart((current) => ({ ...current, [product.id]: quantity }))
  }

  return (
    <>
      <Page bottomNav={false} width="narrow" className="pb-44">
        <div className="flex flex-col gap-4 pt-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar produto…"
            label="Buscar produto"
          />
          <AsyncView
            query={products}
            loading={<SkeletonList count={4} />}
            empty={
              <EmptyState
                icon={Package}
                title="Cadastre um produto para vender"
                action={
                  <ButtonLink to={`${paths.businessProducts}?novo=1`}>Novo produto</ButtonLink>
                }
              />
            }
          >
            {(items) => (
              <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
                {items
                  .filter((product) => matchesSearch(search, product.name, product.group))
                  .map((product) => {
                    const quantity = cart[product.id] ?? 0
                    const max =
                      product.trackStock && !allowNegativeStock
                        ? Math.max(0, product.stock)
                        : undefined
                    const soldOut = max !== undefined && max <= 0
                    return (
                      <li
                        key={product.id}
                        className={cn('flex items-center gap-3 px-4 py-3', soldOut && 'opacity-55')}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-ink-900 truncate text-sm font-bold">{product.name}</p>
                          <p className="text-ink-500 text-xs">
                            {formatCurrency(product.priceCents)}
                            {product.trackStock && (
                              <span
                                className={cn(
                                  product.stock <= product.minStock &&
                                    'text-terracotta-600 font-semibold',
                                )}
                              >
                                {' '}
                                · estoque {formatQuantity(product.stock)}
                              </span>
                            )}
                          </p>
                        </div>
                        {soldOut ? (
                          <Badge color="neutral">Sem estoque</Badge>
                        ) : (
                          <QuantityStepper
                            label={`Quantidade de ${product.name}`}
                            value={quantity}
                            onChange={(value) => setQuantity(product, value)}
                            max={max}
                            step={isWholeUnit(product.unit) ? 1 : 0.1}
                            size="sm"
                          />
                        )}
                      </li>
                    )
                  })}
              </ul>
            )}
          </AsyncView>

          {lines.length > 0 && (
            <>
              <div>
                <p className="text-ink-800 mb-2 text-[0.8125rem] font-bold">Forma de pagamento</p>
                <FilterChips
                  ariaLabel="Forma de pagamento"
                  options={PAYMENTS}
                  value={payment}
                  onChange={setPayment}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Desconto (opcional)">
                  <CurrencyInput value={discount} onValueChange={setDiscount} />
                </Field>
                <Field label="Observação (opcional)">
                  <Input
                    value={note}
                    maxLength={200}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {stockError && (
            <Callout tone="danger" title="Não foi possível registrar a venda">
              {stockError}
            </Callout>
          )}
        </div>
      </Page>

      <StickyActionBar width="narrow">
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-ink-600 text-sm font-semibold">
              {lines.length > 0
                ? pluralize(lines.length, 'item', 'itens')
                : 'Selecione os produtos'}
              {discountCents > 0 && ` · desconto ${formatCurrency(discountCents)}`}
            </span>
            <span className="text-ink-900 text-xl font-extrabold tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
          <Button
            size="lg"
            fullWidth
            disabled={lines.length === 0}
            loading={register.pending}
            onClick={() => void register.run()}
          >
            Registrar venda
          </Button>
        </div>
      </StickyActionBar>
    </>
  )
}

/** Registro de venda: seleção de produtos, quantidades, total e forma de pagamento. */
export default function NewSalePage() {
  const business = useMyBusiness()
  return (
    <>
      <PageHeader title="Nova venda" variant="stack" backTo={paths.businessSales} />
      {business.isPending ? (
        <Page bottomNav={false} width="narrow">
          <SkeletonList count={4} />
        </Page>
      ) : business.data ? (
        <SaleForm
          businessId={business.data.id}
          allowNegativeStock={business.data.settings?.allowNegativeStock ?? false}
        />
      ) : (
        <Page bottomNav={false} width="narrow">
          <EmptyState
            icon={Store}
            title="Cadastre seu estabelecimento"
            action={<ButtonLink to={paths.newBusiness}>Cadastrar estabelecimento</ButtonLink>}
          />
        </Page>
      )}
    </>
  )
}
