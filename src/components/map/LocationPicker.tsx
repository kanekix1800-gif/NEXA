import { LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'

import { Button, Callout, ConfirmDialog, notify } from '@/components/ui'
import { config } from '@/config'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import type { ColorKey, GeoPoint, IconKey } from '@/types'
import { AppError } from '@/utils/errors'
import { approximatePoint, isWithinDemoArea } from '@/utils/geo'

import { MapView } from './MapView'

/** Obtém a posição do aparelho (precisão reduzida a ~110 m, por privacidade). */
function getDevicePosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new AppError('unavailable', 'Seu aparelho não oferece geolocalização.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve(
          approximatePoint({ lat: position.coords.latitude, lng: position.coords.longitude }, 3),
        ),
      (error) =>
        reject(
          new AppError(
            error.code === error.PERMISSION_DENIED ? 'forbidden' : 'unavailable',
            error.code === error.PERMISSION_DENIED
              ? 'A permissão de localização foi negada no navegador.'
              : 'Não foi possível obter a sua localização agora.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

interface LocationPickerProps {
  value: GeoPoint | null
  onChange: (point: GeoPoint | null) => void
  /** Aparência do alfinete (cor e ícone da categoria). */
  color?: ColorKey
  icon?: IconKey
  className?: string
}

/**
 * Seleção de local no mapa: toque para marcar, arraste o alfinete para ajustar ou use
 * a localização do aparelho — sempre com pedido de consentimento antes.
 */
export function LocationPicker({
  value,
  onChange,
  color = 'green',
  icon = 'map-pin',
  className,
}: LocationPickerProps) {
  const [askConsent, setAskConsent] = useState(false)
  const [focus, setFocus] = useState<GeoPoint | null>(null)

  const locate = useAction(
    async () => {
      const point = await getDevicePosition()
      if (!isWithinDemoArea(point)) {
        notify.info(
          'Você está fora da área de demonstração',
          `Os dados do protótipo ficam em ${config.map.cityName}. Marque o local tocando no mapa.`,
        )
        return
      }
      onChange(point)
      setFocus(point)
    },
    { errorFallback: 'Não foi possível usar a sua localização.' },
  )

  const requestMyLocation = async () => {
    const settings = await repos.settings.get()
    if (settings.locationConsent === 'granted') void locate.run()
    else setAskConsent(true)
  }

  return (
    <div className={className}>
      <MapView
        label="Mapa para selecionar o local"
        className="rounded-card border-line h-64 border"
        markers={
          value ? [{ id: 'local', location: value, color, icon, title: 'Local selecionado' }] : []
        }
        selectedId="local"
        draggableId="local"
        focus={focus}
        onMapClick={(point) => onChange(approximatePoint(point, 4))}
        onDragEnd={(point) => onChange(approximatePoint(point, 4))}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<LocateFixed className="size-4" />}
          loading={locate.pending}
          onClick={() => void requestMyLocation()}
        >
          Usar minha localização
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remover marcação
          </Button>
        )}
      </div>
      <p className="text-ink-500 mt-2 flex items-start gap-1.5 text-xs">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {value
          ? 'Local marcado. Arraste o alfinete para ajustar.'
          : 'Toque no mapa para marcar o local aproximado do problema.'}
      </p>
      <Callout tone="info" className="mt-3">
        Marque o local em via pública — nunca a sua residência. A posição é guardada de forma
        aproximada.
      </Callout>

      <ConfirmDialog
        open={askConsent}
        onOpenChange={setAskConsent}
        title="Usar a localização do aparelho?"
        description="O NEXA usará a sua posição aproximada apenas para marcar este local e calcular distâncias. Você pode revogar a permissão em Configurações."
        confirmLabel="Permitir"
        cancelLabel="Agora não"
        onConfirm={async () => {
          await repos.settings.update({ locationConsent: 'granted' })
          void locate.run()
        }}
      />
    </div>
  )
}
