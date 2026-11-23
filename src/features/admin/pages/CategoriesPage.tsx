import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { COLOR_KEYS, COLOR_LABEL, getColorStyle } from '@/components/icons/colors'
import { CATEGORY_ICON_OPTIONS } from '@/components/icons/registry'
import {
  AppIcon,
  AsyncView,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  IconTile,
  Input,
  Modal,
  SegmentedControl,
  Switch,
} from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import type { Category, CategoryKind, ColorKey, IconKey } from '@/types'
import { cn } from '@/utils/cn'
import { isAppError } from '@/utils/errors'

import { AdminShell } from '../components/AdminShell'

const KINDS: Array<{ value: CategoryKind; label: string }> = [
  { value: 'demand', label: 'Demandas' },
  { value: 'business', label: 'Comércio' },
  { value: 'event', label: 'Eventos' },
]

function CategoryForm({
  kind,
  category,
  onClose,
}: {
  kind: CategoryKind
  category: Category | null
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState<IconKey>(category?.icon ?? CATEGORY_ICON_OPTIONS[kind][0]!)
  const [color, setColor] = useState<ColorKey>(category?.color ?? 'green')
  const [error, setError] = useState<string | null>(null)

  const save = useAction(
    () =>
      category
        ? repos.reference.updateCategory(category.id, { name, icon, color })
        : repos.reference.createCategory({ kind, name, icon, color }),
    {
      success: category ? 'Categoria atualizada.' : 'Categoria criada.',
      silentError: true,
      onSuccess: onClose,
      onError: (failure) =>
        setError(isAppError(failure) ? failure.message : 'Não foi possível salvar.'),
    },
  )

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={category ? 'Editar categoria' : 'Nova categoria'}
      footer={
        <Button
          fullWidth
          loading={save.pending}
          disabled={name.trim().length < 2}
          onClick={() => void save.run()}
        >
          Salvar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nome" error={error} required>
          <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div>
          <p className="text-ink-800 mb-2 text-[13px] font-bold">Ícone</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ícone" tabIndex={-1}>
            {CATEGORY_ICON_OPTIONS[kind].map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={icon === option}
                aria-label={option}
                onClick={() => setIcon(option)}
                className={cn(
                  'flex size-11 items-center justify-center rounded-2xl border-2',
                  icon === option
                    ? 'border-nexa-800 bg-nexa-50 text-nexa-900'
                    : 'border-line bg-surface text-ink-600',
                )}
              >
                <AppIcon name={option} className="size-5" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-ink-800 mb-2 text-[13px] font-bold">Cor</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor" tabIndex={-1}>
            {COLOR_KEYS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={color === option}
                aria-label={COLOR_LABEL[option]}
                title={COLOR_LABEL[option]}
                onClick={() => setColor(option)}
                className={cn(
                  'size-9 rounded-full ring-offset-2',
                  color === option && 'ring-nexa-800 ring-2',
                )}
                style={{ backgroundColor: getColorStyle(option).hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Gestão de categorias de demandas, comércio e eventos. */
export default function CategoriesPage() {
  const [kind, setKind] = useState<CategoryKind>('demand')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const categories = useQuery({
    queryKey: ['reference', 'categories', kind, 'all'],
    queryFn: () => repos.reference.listCategories(kind, { includeInactive: true }),
  })
  const toggle = useAction((category: Category) =>
    repos.reference.updateCategory(category.id, { active: !category.active }),
  )
  const remove = useAction((category: Category) => repos.reference.deleteCategory(category.id), {
    success: 'Categoria excluída.',
  })

  return (
    <AdminShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            ariaLabel="Tipo de categoria"
            options={KINDS}
            value={kind}
            onChange={setKind}
          />
          <Button
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() => setEditing('new')}
          >
            Nova categoria
          </Button>
        </div>
        <AsyncView query={categories} empty={<EmptyState icon={Tags} title="Nenhuma categoria" />}>
          {(items) => (
            <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
              {items.map((category) => (
                <li
                  key={category.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    !category.active && 'opacity-60',
                  )}
                >
                  <IconTile icon={category.icon} color={category.color} />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-900 truncate text-sm font-bold">{category.name}</p>
                    <p className="flex flex-wrap gap-1.5">
                      {category.system && <Badge color="neutral">Sistema</Badge>}
                      {!category.active && <Badge color="orange">Inativa</Badge>}
                    </p>
                  </div>
                  <Switch
                    checked={category.active}
                    onChange={() => void toggle.run(category)}
                    label={`${category.active ? 'Desativar' : 'Ativar'} ${category.name}`}
                    disabled={toggle.pending}
                  />
                  <IconButton
                    label={`Editar ${category.name}`}
                    size="sm"
                    onClick={() => setEditing(category)}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  {!category.system && (
                    <IconButton
                      label={`Excluir ${category.name}`}
                      size="sm"
                      disabled={remove.pending}
                      onClick={() => void remove.run(category)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
        <p className="text-ink-500 text-xs">
          Categorias do sistema ou em uso não podem ser excluídas — desative-as para que deixem de
          aparecer em novos cadastros.
        </p>
      </div>
      {editing && (
        <CategoryForm
          key={kind}
          kind={kind}
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </AdminShell>
  )
}
