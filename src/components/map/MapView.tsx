import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { createElement, useEffect, useMemo, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'

import { getColorStyle } from '@/components/icons/colors'
import { getIcon } from '@/components/icons/registry'
import { config } from '@/config'
import type { ColorKey, GeoPoint, IconKey } from '@/types'
import { cn } from '@/utils/cn'

/**
 * COMPONENTES DE MAPA (Leaflet + OpenStreetMap)
 * Todos os mapas do NEXA usam estes componentes, que padronizam os blocos do mapa,
 * os marcadores (alfinetes coloridos com o ícone da categoria) e o enquadramento.
 */

const iconCache = new Map<string, L.DivIcon>()

/** Alfinete colorido com o ícone da categoria. */
export function pinIcon(color: ColorKey, icon: IconKey, selected = false): L.DivIcon {
  const key = `${color}:${icon}:${selected}`
  const cached = iconCache.get(key)
  if (cached) return cached
  const size = selected ? 46 : 36
  const glyph = renderToStaticMarkup(
    createElement(getIcon(icon), { size: selected ? 20 : 16, strokeWidth: 2.4 }),
  )
  const created = L.divIcon({
    className: '',
    html: `<div class="nexa-pin${selected ? ' is-selected' : ''}" style="--pin:${getColorStyle(color).hex}"><span>${glyph}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
  iconCache.set(key, created)
  return created
}

export interface MapMarker {
  id: string
  location: GeoPoint
  color: ColorKey
  icon: IconKey
  /** Nome lido por leitores de tela. */
  title: string
}

function toLatLng(point: GeoPoint): L.LatLngExpression {
  return [point.lat, point.lng]
}

/** Ajusta o enquadramento quando o conjunto de marcadores ou o foco mudam. */
function Viewport({ markers, focus }: { markers: MapMarker[]; focus?: GeoPoint | null }) {
  const map = useMap()
  const signature = markers.map((marker) => marker.id).join('|')
  const focusKey = focus ? `${focus.lat},${focus.lng}` : ''
  const applied = useRef<{ signature: string; focusKey: string } | null>(null)

  useEffect(() => {
    // Aguarda o layout: o contêiner precisa ter o tamanho final antes de enquadrar.
    const frame = requestAnimationFrame(() => {
      map.invalidateSize()
      const previous = applied.current
      applied.current = { signature, focusKey }

      if (focus) {
        if (previous && previous.focusKey !== focusKey) {
          map.flyTo(toLatLng(focus), Math.max(map.getZoom(), 16), { duration: 0.6 })
        } else if (!previous) {
          map.setView(toLatLng(focus), 16)
        }
        return
      }
      if (previous?.signature === signature) return
      if (markers.length > 1) {
        map.fitBounds(L.latLngBounds(markers.map((marker) => toLatLng(marker.location))), {
          padding: [44, 44],
          maxZoom: 16,
        })
      } else if (markers[0]) {
        map.setView(toLatLng(markers[0].location), 16)
      }
    })
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature, focusKey])

  // O contêiner pode mudar de tamanho depois de montado (abas, folhas, rotação do aparelho).
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return null
}

function ClickHandler({ onClick }: { onClick: (point: GeoPoint) => void }) {
  useMapEvents({
    click: (event) => onClick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  })
  return null
}

interface MapViewProps {
  markers: MapMarker[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  /** Clique em um ponto vazio do mapa. */
  onMapClick?: (point: GeoPoint) => void
  /** Leva o mapa até este ponto. */
  focus?: GeoPoint | null
  /** `false` = mapa estático (sem arrastar nem zoom), para prévias. */
  interactive?: boolean
  /** Marcador que pode ser arrastado (seleção de local). */
  draggableId?: string
  onDragEnd?: (point: GeoPoint) => void
  zoom?: number
  className?: string
  /** Descrição do mapa para leitores de tela. */
  label: string
}

/** Mapa com marcadores do NEXA. Defina a altura por `className`. */
export function MapView({
  markers,
  selectedId,
  onSelect,
  onMapClick,
  focus,
  interactive = true,
  draggableId,
  onDragEnd,
  zoom = config.map.defaultZoom,
  className,
  label,
}: MapViewProps) {
  const center = useMemo(
    () => toLatLng(markers[0]?.location ?? config.map.center),
    // O centro inicial só importa na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className={cn('relative overflow-hidden', className)} role="region" aria-label={label}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="size-full"
        zoomControl={false}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        attributionControl
      >
        <TileLayer url={config.map.tileUrl} attribution={config.map.tileAttribution} maxZoom={19} />
        {interactive && <ZoomControl position="bottomright" />}
        <Viewport markers={markers} focus={focus} />
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={toLatLng(marker.location)}
            icon={pinIcon(marker.color, marker.icon, marker.id === selectedId)}
            title={marker.title}
            alt={marker.title}
            zIndexOffset={marker.id === selectedId ? 1000 : 0}
            draggable={marker.id === draggableId}
            eventHandlers={{
              click: () => onSelect?.(marker.id),
              dragend: (event) => {
                const position = (event.target as L.Marker).getLatLng()
                onDragEnd?.({ lat: position.lat, lng: position.lng })
              },
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
