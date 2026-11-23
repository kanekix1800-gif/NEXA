import { useQuery } from '@tanstack/react-query'
import { Minus, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  AsyncView,
  Badge,
  Button,
  ConfirmDialog,
  CurrencyInput,
  EmptyState,
  Fab,
  Field,
  IconButton,
  Input,
  Modal,
  SearchInput,
  Select,
  SwitchRow,
} from '@/components/ui'
import { config } from '@/config'
import { useAction } from '@/hooks/useAction'
import { repos, type ProductInput } from '@/repositories'
import { isLowStock } from '@/services/business/sales'
import { PRODUCT_UNIT_LABEL, type BusinessView, type Product, type ProductUnit } from '@/types'
import { cn } from '@/utils/cn'
import { isAppError } from '@/utils/errors'
import { formatCurrency, formatQuantity } from '@/utils/format'
import { matchesSearch } from '@/utils/text'

import { BusinessShell } from '../components/BusinessShell'

const EMPTY: ProductInput = {
  name: '',
  group: '',
  description: '',
  priceCents: 0,
  costCents: null,
  trackStock: true,
  stock: 0,
  minStock: 0,
  unit: 'un',
  showInCatalog: true,
  active: true,
}

function ProductForm({
  businessId,
  product,
  onClose,
}: {
  businessId: string
  product: Product | null
  onClose: () => void
}) {
  const [form, setForm] = useState<ProductInput>(
    product
      ? {
          name: product.name,
          group: product.group ?? '',
          description: product.description ?? '',
          priceCents: product.priceCents,
          costCents: product.costCents ?? null,
          trackStock: product.trackStock,
          stock: product.stock,
          minStock: product.minStock,
          unit: product.unit,
          showInCatalog: product.showInCatalog,
          active: product.active,
        }
      : EMPTY,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const save = useAction(
    () => {
      const input = {
        ...form,
        group: form.group || undefined,
        description: form.description || undefined,
      }
      return product
        ? repos.products.update(product.id, input)
        : repos.products.create(businessId, input)
    },
    {
      success: product ? 'Produto atualizado.' : 'Produto cadastrado.',
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
      title={product ? 'Editar produto' : 'Novo produto'}
      footer={
        <Button
          fullWidth
          loading={save.pending}
          onClick={() => {
            setErrors({})
            void save.run()
          }}
        >
          {product ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nome" error={errors.name} required>
          <Input
            value={form.name}
            maxLength={config.limits.productNameMaxLength}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Ex.: Pão de queijo"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço de venda" error={errors.priceCents} required>
            <CurrencyInput
              value={form.priceCents}
              onValueChange={(cents) => set('priceCents', cents ?? 0)}
            />
          </Field>
          <Field label="Custo (opcional)" error={errors.costCents}>
            <CurrencyInput
              value={form.costCents ?? null}
              onValueChange={(cents) => set('costCents', cents)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grupo (opcional)" error={errors.group}>
            <Input
              value={form.group ?? ''}
              onChange={(event) => set('group', event.target.value)}
              placeholder="Ex.: Pães"
            />
          </Field>
          <Field label="Unidade" error={errors.unit}>
            <Select
              value={form.unit}
              onChange={(event) => set('unit', event.target.value as ProductUnit)}
            >
              {Object.entries(PRODUCT_UNIT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="bg-surface rounded-2xl px-4 shadow-card">
          <SwitchRow
            title="Controlar estoque"
            description="Desative para serviços e itens feitos na hora."
            checked={form.trackStock}
            onChange={(checked) => set('trackStock', checked)}
          />
        </div>
        {form.trackStock && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade em estoque" error={errors.stock}>
              <Input
                inputMode="decimal"
                value={String(form.stock).replace('.', ',')}
                onChange={(event) =>
                  set('stock', Number(event.target.value.replace(',', '.')) || 0)
                }
              />
            </Field>
            <Field
              label="Estoque mínimo"
              error={errors.minStock}
              hint="Avisamos quando chegar aqui."
            >
              <Input
                inputMode="decimal"
                value={String(form.minStock).replace('.', ',')}
                onChange={(event) =>
                  set('minStock', Number(event.target.value.replace(',', '.')) || 0)
                }
              />
            </Field>
          </div>
        )}
        <div className="bg-surface divide-line divide-y rounded-2xl px-4 shadow-card">
          <SwitchRow
            title="Mostrar na página do estabelecimento"
            checked={form.showInCatalog}
            onChange={(checked) => set('showInCatalog', checked)}
          />
          <SwitchRow
            title="Produto ativo"
            checked={form.active}
            onChange={(checked) => set('active', checked)}
          />
        </div>
      </div>
    </Modal>
  )
}

function Products({ business }: { business: BusinessView }) {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(params.get('novo') ? 'new' : null)
  const [removing, setRemoving] = useState<Product | null>(null)
  const onlyLow = params.get('estoque') === 'baixo'

  const products = useQuery({
    queryKey: ['business', business.id, 'products'],
    queryFn: () => repos.products.list(business.id, { includeInactive: true }),
  })
  const adjust = useAction((product: Product, delta: number) =>
    repos.products.adjustStock(product.id, delta),
  )
  const remove = useAction((product: Product) => repos.products.remove(product.id), {
    success: 'Produto removido.',
  })

  const filter = (items: Product[]) =>
    items.filter(
      (product) =>
        matchesSearch(search, product.name, product.group) && (!onlyLow || isLowStock(product)),
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar produtos…"
          label="Buscar produtos"
          className="min-w-52 flex-1"
        />
        <button
          type="button"
          aria-pressed={onlyLow}
          onClick={() => setParams(onlyLow ? {} : { estoque: 'baixo' }, { replace: true })}
          className={cn(
            'h-11 rounded-full border px-4 text-[13px] font-semibold transition-colors',
            onlyLow
              ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-600'
              : 'border-line bg-surface text-ink-600',
          )}
        >
          Estoque baixo
        </button>
        <Button
          className="hidden lg:inline-flex"
          leftIcon={<Plus className="size-4" />}
          onClick={() => setEditing('new')}
        >
          Novo produto
        </Button>
      </div>

      <AsyncView
        query={products}
        isEmpty={(items) => filter(items).length === 0}
        empty={
          <EmptyState
            icon={Package}
            title={onlyLow ? 'Nenhum produto com estoque baixo' : 'Nenhum produto encontrado'}
            description={onlyLow ? 'Seu estoque está em dia.' : 'Cadastre os itens que você vende.'}
            action={<Button onClick={() => setEditing('new')}>Cadastrar produto</Button>}
          />
        }
      >
        {(items) => (
          <ul className="grid gap-3 lg:grid-cols-2">
            {filter(items).map((product) => {
              const low = isLowStock(product)
              return (
                <li
                  key={product.id}
                  className={cn(
                    'rounded-card bg-surface shadow-card p-4',
                    !product.active && 'opacity-60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-900 truncate text-[15px] font-bold">{product.name}</p>
                      <p className="text-ink-500 text-xs">
                        {product.group ?? 'Sem grupo'} · {formatCurrency(product.priceCents)} /{' '}
                        {PRODUCT_UNIT_LABEL[product.unit]}
                      </p>
                    </div>
                    <IconButton
                      label={`Editar ${product.name}`}
                      size="sm"
                      onClick={() => setEditing(product)}
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton
                      label={`Excluir ${product.name}`}
                      size="sm"
                      onClick={() => setRemoving(product)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {product.trackStock ? (
                      <>
                        <Badge
                          color={product.stock <= 0 ? 'terracotta' : low ? 'orange' : 'green'}
                          size="md"
                        >
                          Estoque: {formatQuantity(product.stock)}
                        </Badge>
                        <span className="text-ink-400 text-xs">
                          mín. {formatQuantity(product.minStock)}
                        </span>
                        <span className="ml-auto flex items-center gap-1.5">
                          <IconButton
                            label={`Retirar 1 de ${product.name}`}
                            size="sm"
                            variant="soft"
                            disabled={adjust.pending || product.stock <= 0}
                            onClick={() => void adjust.run(product, -1)}
                          >
                            <Minus className="size-4" />
                          </IconButton>
                          <IconButton
                            label={`Adicionar 1 a ${product.name}`}
                            size="sm"
                            variant="soft"
                            disabled={adjust.pending}
                            onClick={() => void adjust.run(product, 1)}
                          >
                            <Plus className="size-4" />
                          </IconButton>
                        </span>
                      </>
                    ) : (
                      <Badge color="neutral" size="md">
                        Sem controle de estoque
                      </Badge>
                    )}
                    {!product.active && <Badge color="neutral">Inativo</Badge>}
                    {!product.showInCatalog && <Badge color="neutral">Fora do catálogo</Badge>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </AsyncView>

      <div className="lg:hidden">
        <Fab
          label="Novo produto"
          icon={<Plus className="size-6" />}
          onClick={() => setEditing('new')}
        />
      </div>

      {editing && (
        <ProductForm
          businessId={business.id}
          product={editing === 'new' ? null : editing}
          onClose={() => {
            setEditing(null)
            if (params.get('novo')) setParams({}, { replace: true })
          }}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Excluir ${removing?.name ?? 'produto'}?`}
        description="Produtos com vendas registradas são apenas desativados, para preservar o histórico."
        confirmLabel="Excluir"
        tone="danger"
        onConfirm={async () => {
          if (removing) await remove.run(removing)
        }}
      />
    </div>
  )
}

/** Gestão de produtos: cadastro, edição, preços e estoque. */
export default function ProductsPage() {
  return <BusinessShell>{(business) => <Products business={business} />}</BusinessShell>
}
