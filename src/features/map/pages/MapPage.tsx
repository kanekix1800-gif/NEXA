import { useQuery } from '@tanstack/react-query'
import { MapPin, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { paths } from '@/app/paths'
import { DemandStatusBadge } from '@/components/domain'
import { MapView } from '@/components/map'
import {
  ButtonLink,
  DemoBadge,
  ErrorState,
  IconButton,
  IconTile,
  PageHeader,
  Spinner,
} from '@/components/ui'
import { repos } from '@/repositories'
import { getPreferences } from '@/services/accessibility/preferences'
import { MAP_LAYER_LABEL, type MapLayer } from '@/types'
import { cn } from '@/utils/cn'

const LAYERS: MapLayer[] = [
  'demands',
  'businesses',
  'institutions',
  'events',
  'services',
  'accessibility',
  'transit',
]

/** Camadas de mobilidade: começam ligadas só para quem pediu destaques em Acessibilidade. */
const MOBILITY_LAYERS: MapLayer[] = ['accessibility', 'transit']

const LAYER_DOT: Record<MapLayer, string> = {
  demands: 'bg-terracotta-600',
  businesses: 'bg-sun-500',
  institutions: 'bg-nexa-800',
  events: 'bg-purple-600',
  services: 'bg-blue-600',
  accessibility: 'bg-teal-600',
  transit: 'bg-blue-600',
}

function initialLayers(only: MapLayer | null, focusId: string | null): Set<MapLayer> {
  if (only && LAYERS.includes(only)) return new Set([only])
  const layers = new Set(LAYERS.filter((layer) => !MOBILITY_LAYERS.includes(layer)))
  const highlights = getPreferences().highlights
  if (highlights.includes('step_free') || highlights.includes('audio_tactile')) {
    layers.add('accessibility')
  }
  if (highlights.includes('accessible_transit')) layers.add('transit')
  // Um ponto em foco sempre aparece, mesmo que a camada dele comece desligada.
  const focusLayer = focusId?.split(':')[0] as MapLayer | undefined
  if (focusLayer && LAYERS.includes(focusLayer)) layers.add(focusLayer)
  return layers
}

/**
 * Mapa inteligente: demandas, comércio, instituições, eventos, serviços, barreiras e
 * apoios de acessibilidade e paradas de ônibus em um só lugar, com filtros por camada
 * e cartão de detalhes ao tocar em um marcador.
 */
export default function MapPage() {
  const [params, setParams] = useSearchParams()
  const points = useQuery({ queryKey: ['map', 'points'], queryFn: () => repos.map.listPoints() })

  // ?foco=demands:dem_01 abre com o ponto selecionado; ?camada=demands mostra só uma camada.
  const focusId = params.get('foco')
  const onlyLayer = params.get('camada') as MapLayer | null
  const [active, setActive] = useState<Set<MapLayer>>(() => initialLayers(onlyLayer, focusId))
  const [selectedId, setSelectedId] = useState<string | null>(focusId)

  const visible = useMemo(
    () => (points.data ?? []).filter((point) => active.has(point.layer) || point.id === selectedId),
    [points.data, active, selectedId],
  )
  const selected = visible.find((point) => point.id === selectedId) ?? null
  const counts = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const point of points.data ?? []) totals[point.layer] = (totals[point.layer] ?? 0) + 1
    return totals
  }, [points.data])

  const toggle = (layer: MapLayer) => {
    setActive((current) => {
      const next = new Set(current)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }

  const select = (id: string | null) => {
    setSelectedId(id)
    setParams(id ? { foco: id } : {}, { replace: true })
  }

  return (
    <div className="flex h-dvh flex-col pb-[calc(var(--nexa-bottom-nav-height)+var(--nexa-safe-bottom))] lg:pb-0">
      <PageHeader
        title="Mapa inteligente"
        variant="stack"
        backTo={paths.home}
        width="full"
        actions={<DemoBadge label="Demo" />}
      >
        <div
          className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5"
          role="group"
          aria-label="Camadas do mapa"
        >
          {LAYERS.map((layer) => {
            const on = active.has(layer)
            return (
              <button
                key={layer}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(layer)}
                className={cn(
                  'inline-flex h-[2.375rem] shrink-0 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors',
                  on
                    ? 'border-nexa-900 bg-nexa-900 text-white'
                    : 'border-line bg-surface text-ink-500',
                )}
              >
                <span
                  className={cn('size-2.5 rounded-full', LAYER_DOT[layer], !on && 'opacity-40')}
                  aria-hidden
                />
                {MAP_LAYER_LABEL[layer]}
                <span className={cn('tabular-nums', on ? 'text-white/70' : 'text-ink-400')}>
                  {counts[layer] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </PageHeader>

      <div className="relative min-h-0 flex-1">
        {points.isError ? (
          <ErrorState error={points.error} onRetry={() => void points.refetch()} />
        ) : (
          <MapView
            label="Mapa da comunidade"
            className="size-full"
            markers={visible.map((point) => ({
              id: point.id,
              location: point.location,
              color: point.color,
              icon: point.icon,
              title: point.title,
            }))}
            selectedId={selectedId}
            onSelect={select}
            onMapClick={() => select(null)}
            focus={selected?.location ?? null}
          />
        )}

        {points.isPending && (
          <div className="bg-canvas/70 absolute inset-0 z-[500] flex items-center justify-center">
            <Spinner className="text-nexa-800 size-8" label="Carregando o mapa" />
          </div>
        )}

        <p className="bg-surface/90 text-ink-600 pointer-events-none absolute top-3 left-1/2 z-[500] w-max max-w-[92%] -translate-x-1/2 rounded-full px-3 py-1.5 text-center text-[0.6875rem] font-semibold shadow-card">
          Marcadores fictícios — não representam locais ou ocorrências reais
        </p>

        {selected && (
          <aside
            className="bg-surface rounded-card shadow-raised animate-rise absolute inset-x-3 bottom-3 z-[500] p-4 lg:right-auto lg:left-4 lg:w-96"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <IconTile icon={selected.icon} color={selected.color} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-ink-500 text-[0.6875rem] font-bold tracking-wide uppercase">
                  {MAP_LAYER_LABEL[selected.layer]} · {selected.categoryLabel}
                </p>
                <h2 className="text-ink-900 text-base leading-snug font-bold">{selected.title}</h2>
              </div>
              <IconButton
                label="Fechar"
                size="sm"
                className="-mt-1 -mr-1.5"
                onClick={() => select(null)}
              >
                <X className="size-[1.125rem]" />
              </IconButton>
            </div>
            <p className="text-ink-600 mt-2 line-clamp-3 text-[0.8125rem] leading-snug">
              {selected.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {selected.demandStatus && <DemandStatusBadge status={selected.demandStatus} />}
              {selected.meta && (
                <span className="text-ink-700 text-xs font-bold">{selected.meta}</span>
              )}
            </div>
            <p className="text-ink-500 mt-2 flex items-start gap-1.5 text-xs">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {selected.addressLabel}
            </p>
            <ButtonLink to={selected.to} fullWidth className="mt-3">
              Ver detalhes
            </ButtonLink>
          </aside>
        )}
      </div>
    </div>
  )
}
