import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Modal, SearchInput, useFieldControl } from '@/components/ui'
import { repos } from '@/repositories'
import type { Neighborhood } from '@/types'
import { cn } from '@/utils/cn'
import { matchesSearch, pluralize } from '@/utils/text'

/** Ordem das regiões na lista (as demais vêm depois, em ordem alfabética). */
const ZONE_ORDER = ['Região Central', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste']
const NO_ZONE = 'Outros bairros'

function zoneRank(zone: string): number {
  const index = ZONE_ORDER.indexOf(zone)
  return index === -1 ? ZONE_ORDER.length : index
}

/** Agrupa os bairros por região, com regiões e bairros em ordem estável. */
export function groupNeighborhoods(
  neighborhoods: Neighborhood[],
): Array<{ zone: string; items: Neighborhood[] }> {
  const groups = new Map<string, Neighborhood[]>()
  for (const neighborhood of neighborhoods) {
    const zone = neighborhood.zone ?? NO_ZONE
    groups.set(zone, [...(groups.get(zone) ?? []), neighborhood])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => zoneRank(a) - zoneRank(b) || a.localeCompare(b, 'pt-BR'))
    .map(([zone, items]) => ({
      zone,
      items: items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }))
}

/** Bairros que correspondem à busca (pelo nome ou pela região), sem diferenciar acentos. */
export function searchNeighborhoods(neighborhoods: Neighborhood[], query: string): Neighborhood[] {
  return neighborhoods.filter((neighborhood) =>
    matchesSearch(query, neighborhood.name, neighborhood.zone),
  )
}

interface NeighborhoodPickerProps {
  /** ID do bairro escolhido; texto vazio = nenhum. */
  value: string
  onChange: (id: string) => void
  /** Texto exibido quando nada foi escolhido. */
  placeholder?: string
  /** Rótulo da opção "todos" — quando informado, o seletor funciona como filtro. */
  allLabel?: string
  /** `field` = campo de formulário; `chip` = filtro compacto em pílula. */
  variant?: 'field' | 'chip'
  /** Nome acessível quando o seletor não está dentro de um `Field`. */
  ariaLabel?: string
  className?: string
}

/**
 * Seletor de bairro com busca: abre uma lista agrupada por região e filtra enquanto
 * a pessoa digita. Substitui a lista suspensa simples, que ficava longa demais.
 */
export function NeighborhoodPicker({
  value,
  onChange,
  placeholder = 'Selecione o bairro',
  allLabel,
  variant = 'field',
  ariaLabel,
  className,
}: NeighborhoodPickerProps) {
  const control = useFieldControl({})
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const neighborhoods = useQuery({
    queryKey: ['reference', 'neighborhoods'],
    queryFn: () => repos.reference.listNeighborhoods(),
    staleTime: Infinity,
  })

  const all = useMemo(() => neighborhoods.data ?? [], [neighborhoods.data])
  const selected = all.find((neighborhood) => neighborhood.id === value)
  const results = useMemo(() => searchNeighborhoods(all, query), [all, query])
  const groups = useMemo(() => groupNeighborhoods(results), [results])

  const choose = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  const label = selected?.name ?? (allLabel && value === '' ? allLabel : placeholder)

  return (
    <>
      <button
        type="button"
        id={control.id}
        aria-describedby={control['aria-describedby']}
        data-invalid={control['aria-invalid'] ? '' : undefined}
        aria-haspopup="dialog"
        aria-label={ariaLabel ? `${ariaLabel}: ${label}` : undefined}
        onClick={() => setOpen(true)}
        className={cn(
          variant === 'field'
            ? 'border-line bg-surface focus:border-nexa-600 focus:ring-nexa-100 data-[invalid]:border-danger-500 flex h-12 w-full items-center gap-2.5 rounded-2xl border px-4 text-left text-[0.9375rem] outline-none focus:ring-4'
            : 'border-line bg-surface inline-flex h-[2.375rem] max-w-full shrink-0 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-semibold',
          selected || (allLabel && value === '') ? 'text-ink-900' : 'text-ink-400',
          variant === 'chip' && selected && 'border-nexa-900 bg-nexa-900 text-white',
          className,
        )}
      >
        <MapPin className="size-4 shrink-0 opacity-70" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
      </button>

      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery('')
        }}
        title={allLabel ? 'Filtrar por bairro' : 'Escolher bairro'}
        description="Digite para procurar pelo nome do bairro ou pela região."
      >
        <div className="flex flex-col gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar bairro…"
            label="Buscar bairro"
          />
          <p className="text-ink-600 text-xs" role="status" aria-live="polite">
            {neighborhoods.isPending
              ? 'Carregando os bairros…'
              : results.length === 0
                ? `Nenhum bairro encontrado para "${query}".`
                : pluralize(results.length, 'bairro encontrado', 'bairros encontrados')}
          </p>

          {allLabel && query === '' && (
            <Option label={allLabel} selected={value === ''} onSelect={() => choose('')} />
          )}

          {groups.map((group) => (
            <section key={group.zone} aria-label={group.zone}>
              <h3 className="text-ink-500 mb-1 px-1 text-[0.6875rem] font-bold tracking-wide uppercase">
                {group.zone}
              </h3>
              <ul className="bg-surface rounded-card shadow-card divide-line divide-y">
                {group.items.map((neighborhood) => (
                  <li key={neighborhood.id}>
                    <Option
                      label={neighborhood.name}
                      selected={neighborhood.id === value}
                      onSelect={() => choose(neighborhood.id)}
                      flat
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Modal>
    </>
  )
}

function Option({
  label,
  selected,
  onSelect,
  flat = false,
}: {
  label: string
  selected: boolean
  onSelect: () => void
  flat?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'text-ink-900 flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[0.9375rem]',
        !flat && 'bg-surface rounded-card shadow-card',
        selected && 'font-bold',
      )}
    >
      {label}
      {selected && <Check className="text-nexa-800 size-5 shrink-0" aria-hidden />}
    </button>
  )
}
