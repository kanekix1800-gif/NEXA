import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  BusFront,
  Clock,
  Footprints,
  LocateFixed,
  MapPin,
  Megaphone,
  Play,
  Square,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { paths, type MobilityTab } from '@/app/paths'
import { SpeakButton } from '@/components/accessibility'
import { NeighborhoodPicker } from '@/components/domain/NeighborhoodPicker'
import {
  AsyncView,
  Badge,
  Button,
  ButtonLink,
  Callout,
  Card,
  DemoBadge,
  EmptyState,
  FilterChips,
  IconTile,
  Page,
  PageHeader,
  SearchInput,
  SectionHeader,
  SegmentedControl,
  Select,
  SwitchRow,
  type ChoiceOption,
} from '@/components/ui'
import { useAccessibilityPreferences } from '@/hooks/useAccessibility'
import { repos } from '@/repositories'
import { playSound, signalAlert } from '@/services/accessibility/feedback'
import { updatePreferences } from '@/services/accessibility/preferences'
import { isSpeaking, speak, stopSpeaking } from '@/services/accessibility/speech'
import {
  describeAccessPoint,
  describeLine,
  describeProximityAlert,
  describeStop,
} from '@/services/mobility/describe'
import {
  ALERT_RADIUS_METERS,
  buildSimulatedWalk,
  findProximityAlerts,
  forgetDistantAlerts,
  nearestBarrier,
  type ProximityHit,
} from '@/services/mobility/proximity'
import {
  ACCESS_AUDIENCE_LABEL,
  ACCESS_POINT_ICON,
  ACCESS_POINT_KIND_LABEL,
  FLEET_ACCESSIBILITY_LABEL,
  STOP_FEATURE_LABEL,
  TRANSIT_FEATURE_LABEL,
  type AccessAudience,
  type AccessPointView,
  type FleetAccessibility,
  type GeoPoint,
  type TransitFeature,
  type TransitLineView,
  type TransitStopView,
} from '@/types'
import { cn } from '@/utils/cn'
import { formatDistance } from '@/utils/format'
import { isWithinDemoArea } from '@/utils/geo'
import { pluralize } from '@/utils/text'

const TABS: Array<ChoiceOption<MobilityTab>> = [
  { value: 'onibus', label: 'Ônibus' },
  { value: 'caminho', label: 'No caminho' },
  { value: 'alertas', label: 'Alertas' },
]

const DEMO_NOTE =
  'Linhas, horários, paradas e pontos de atenção são fictícios: mostram como a informação ajuda a planejar o caminho.'

// ── Ônibus ───────────────────────────────────────────────────────────────────

type LineFilter = 'all' | 'accessible' | TransitFeature

const LINE_FILTERS: Array<ChoiceOption<LineFilter>> = [
  { value: 'all', label: 'Todas' },
  { value: 'accessible', label: 'Acessíveis' },
  { value: 'lift', label: 'Com elevador' },
  { value: 'low_floor', label: 'Piso baixo' },
  { value: 'audio_announcements', label: 'Aviso sonoro' },
  { value: 'visual_display', label: 'Painel visual' },
]

const FLEET_BADGE: Record<FleetAccessibility, 'green' | 'orange' | 'terracotta'> = {
  all: 'green',
  partial: 'orange',
  none: 'terracotta',
}

function StopCard({ stop, highlighted }: { stop: TransitStopView; highlighted?: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' })
  }, [highlighted])
  return (
    <li
      ref={ref}
      className={cn(
        'bg-surface rounded-card shadow-card flex flex-col gap-2 p-4',
        highlighted && 'ring-sun-400 ring-4',
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <IconTile icon="bus" color="blue" />
        <div className="min-w-[9rem] flex-1">
          <h3 className="text-ink-900 text-[0.9375rem] leading-snug font-bold">{stop.name}</h3>
          <p className="text-ink-600 text-xs">
            {stop.addressHint} · {stop.neighborhoodName}
          </p>
          <p className="text-ink-800 mt-0.5 text-xs font-bold">
            {formatDistance(stop.distanceMeters)} de você
          </p>
        </div>
        <SpeakButton text={() => describeStop(stop)} label={`Ouvir sobre a parada ${stop.name}`} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stop.features.length === 0 ? (
          <Badge color="terracotta">Sem abrigo e sem piso tátil</Badge>
        ) : (
          stop.features.map((feature) => (
            <Badge key={feature} color="teal">
              {STOP_FEATURE_LABEL[feature]}
            </Badge>
          ))
        )}
      </div>
      {stop.lines.length > 0 && (
        <p className="text-ink-700 text-xs">
          Linhas:{' '}
          {stop.lines.map((line, index) => (
            <span key={line.id}>
              {index > 0 && ', '}
              <Link to={paths.mobilityLine(line.id)} className="text-nexa-800 font-bold underline">
                {line.code}
              </Link>
              {!line.accessible && ' (sem acessibilidade)'}
            </span>
          ))}
        </p>
      )}
    </li>
  )
}

function LineCard({ line, highlighted }: { line: TransitLineView; highlighted?: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' })
  }, [highlighted])
  return (
    <li
      ref={ref}
      className={cn(
        'bg-surface rounded-card shadow-card flex flex-col gap-3 p-4',
        highlighted && 'ring-sun-400 ring-4',
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="bg-nexa-900 flex h-12 min-w-14 shrink-0 items-center justify-center rounded-2xl px-2 text-lg font-extrabold text-white tabular-nums"
          aria-hidden
        >
          {line.code}
        </span>
        <div className="min-w-[9rem] flex-1">
          <h3 className="text-ink-900 text-[0.9375rem] leading-snug font-bold">
            <span className="sr-only">Linha {line.code}: </span>
            {line.name}
          </h3>
          <p className="text-ink-600 text-xs">{line.neighborhoodNames.join(' · ')}</p>
        </div>
        <SpeakButton text={() => describeLine(line)} label={`Ouvir sobre a linha ${line.code}`} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge color={FLEET_BADGE[line.fleet]} variant="solid">
          {FLEET_ACCESSIBILITY_LABEL[line.fleet]}
        </Badge>
        {line.features.map((feature) => (
          <Badge key={feature} color="neutral">
            {TRANSIT_FEATURE_LABEL[feature]}
          </Badge>
        ))}
      </div>

      <p className="text-ink-800 flex items-start gap-2 text-[0.8125rem]">
        <Clock className="text-ink-500 mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {line.nextDepartures.length > 0 ? (
            <>
              Próximas partidas: <strong>{line.nextDepartures.join(' · ')}</strong>
            </>
          ) : (
            <strong>Não há mais partidas hoje.</strong>
          )}
          <span className="text-ink-600 block text-xs">
            A cada {line.frequencyMinutes} min, das {line.firstDeparture} às {line.lastDeparture}
          </span>
        </span>
      </p>

      {line.note && (
        <p className="bg-sun-50 text-ink-800 rounded-2xl px-3 py-2 text-[0.8125rem]">{line.note}</p>
      )}

      <details className="group">
        <summary className="text-nexa-800 flex min-h-11 cursor-pointer list-none items-center text-[0.8125rem] font-bold [&::-webkit-details-marker]:hidden">
          Ver as {pluralize(line.stops.length, 'parada', 'paradas')}
        </summary>
        <ol className="border-line ml-1.5 flex flex-col gap-2.5 border-l-2 pt-1 pl-4">
          {line.stops.map((stop) => (
            <li key={stop.id} className="text-[0.8125rem]">
              <span className="text-ink-900 font-bold">{stop.name}</span>
              <span className="text-ink-600"> · {stop.neighborhoodName}</span>
              <span className="text-ink-600 block text-xs">
                {stop.features.length > 0
                  ? stop.features.map((feature) => STOP_FEATURE_LABEL[feature]).join(', ')
                  : 'Sem abrigo e sem piso tátil'}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </li>
  )
}

function BusesTab({ lineId, stopId }: { lineId: string | null; stopId: string | null }) {
  const prefs = useAccessibilityPreferences()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LineFilter>(
    prefs.highlights.includes('accessible_transit') ? 'accessible' : 'all',
  )
  const [neighborhoodId, setNeighborhoodId] = useState('')

  const lines = useQuery({
    queryKey: ['mobility', 'lines', filter, neighborhoodId, search],
    queryFn: () =>
      repos.mobility.listLines({
        accessibleOnly: filter === 'accessible',
        features: filter === 'all' || filter === 'accessible' ? undefined : [filter],
        neighborhoodId: neighborhoodId || undefined,
        search,
      }),
    // A lista anterior fica na tela enquanto a nova chega (sem piscar a cada letra)…
    placeholderData: keepPreviousData,
    // …e as "próximas partidas" não ficam paradas no tempo com a tela aberta.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  // A linha aberta por um link aparece sempre, qualquer que seja o filtro escolhido.
  const focusedLine = useQuery({
    queryKey: ['mobility', 'line', lineId],
    queryFn: () => repos.mobility.getLine(lineId ?? ''),
    enabled: lineId !== null,
    refetchInterval: 60_000,
    retry: false,
  })
  const stops = useQuery({
    queryKey: ['mobility', 'stops'],
    queryFn: () => repos.mobility.listStops(),
  })
  const focusedStop = stops.data?.find((stop) => stop.id === stopId)
  const nearest = (stops.data ?? []).filter((stop) => stop.id !== stopId).slice(0, 3)

  return (
    <div className="flex flex-col gap-5">
      {focusedStop && (
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="Parada selecionada" />
          <ul>
            <StopCard stop={focusedStop} highlighted />
          </ul>
        </section>
      )}

      {focusedLine.data && (
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="Linha selecionada" />
          <ul>
            <LineCard line={focusedLine.data} highlighted />
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeader title="Linhas de ônibus" />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar linha, parada ou bairro…"
          label="Buscar linha, parada ou bairro"
        />
        <FilterChips
          ariaLabel="Filtrar linhas por recurso"
          options={LINE_FILTERS}
          value={filter}
          onChange={setFilter}
        />
        <NeighborhoodPicker
          variant="chip"
          value={neighborhoodId}
          onChange={setNeighborhoodId}
          allLabel="Todos os bairros"
          ariaLabel="Bairro"
          className="self-start"
        />
        <AsyncView
          query={lines}
          empty={
            <EmptyState
              icon={BusFront}
              title="Nenhuma linha encontrada"
              description="Tente outro filtro, outro bairro ou outra palavra na busca."
            />
          }
        >
          {(items) => (
            <>
              <p className="text-ink-600 text-xs" role="status">
                {pluralize(items.length, 'linha', 'linhas')} ·{' '}
                {items.filter((line) => line.accessible).length} com ônibus acessíveis
              </p>
              <ul className="flex flex-col gap-3">
                {items
                  .filter((line) => line.id !== focusedLine.data?.id)
                  .map((line) => (
                    <LineCard key={line.id} line={line} />
                  ))}
              </ul>
            </>
          )}
        </AsyncView>
      </section>

      {nearest.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionHeader
            title="Paradas mais perto de você"
            to={paths.mapLayer('transit')}
            actionLabel="Ver no mapa"
          />
          <ul className="flex flex-col gap-3">
            {nearest.map((stop) => (
              <StopCard key={stop.id} stop={stop} />
            ))}
          </ul>
        </section>
      )}

      <Callout tone="demo" title="Dados demonstrativos">
        {DEMO_NOTE}
      </Callout>
    </div>
  )
}

// ── Barreiras e apoios no caminho ────────────────────────────────────────────

type NatureFilter = 'all' | 'barrier' | 'support'

const NATURE_FILTERS: Array<ChoiceOption<NatureFilter>> = [
  { value: 'all', label: 'Tudo' },
  { value: 'barrier', label: 'Barreiras' },
  { value: 'support', label: 'Apoios' },
]

const AUDIENCES = Object.keys(ACCESS_AUDIENCE_LABEL) as AccessAudience[]

/** Barreiras que exigem atenção especial de quem não enxerga o desnível. */
function isHazardForBlind(point: AccessPointView): boolean {
  return (
    point.nature === 'barrier' &&
    (point.audiences.includes('blind') || point.audiences.includes('low_vision'))
  )
}

function PointCard({ point, highlighted }: { point: AccessPointView; highlighted: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' })
  }, [highlighted])
  const barrier = point.nature === 'barrier'

  return (
    <li
      ref={ref}
      className={cn(
        'bg-surface rounded-card shadow-card flex flex-col gap-2.5 border-l-[6px] p-4',
        barrier ? 'border-terracotta-600' : 'border-teal-600',
        highlighted && 'ring-sun-400 ring-4',
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <IconTile icon={ACCESS_POINT_ICON[point.kind]} color={barrier ? 'terracotta' : 'teal'} />
        <div className="min-w-[9rem] flex-1">
          <p className="text-ink-600 text-[0.6875rem] font-bold tracking-wide uppercase">
            {barrier ? 'Barreira' : 'Apoio'} · {ACCESS_POINT_KIND_LABEL[point.kind]}
          </p>
          <h3 className="text-ink-900 text-[0.9375rem] leading-snug font-bold">{point.title}</h3>
          <p className="text-ink-600 flex items-start gap-1 text-xs">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {point.addressHint} · {point.neighborhoodName}
          </p>
          <p className="text-ink-800 mt-0.5 text-xs font-bold">
            {formatDistance(point.distanceMeters)} de você
          </p>
        </div>
        <SpeakButton text={() => describeAccessPoint(point)} label={`Ouvir sobre ${point.title}`} />
      </div>

      {isHazardForBlind(point) && (
        <p className="bg-terracotta-50 text-terracotta-600 flex items-center gap-2 rounded-2xl px-3 py-2 text-[0.8125rem] font-bold">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          Atenção redobrada para quem é cego ou tem baixa visão
        </p>
      )}

      <p className="text-ink-700 text-[0.8125rem] leading-snug">{point.description}</p>

      {point.alternative && (
        <p className="bg-nexa-50 text-ink-900 rounded-2xl px-3 py-2 text-[0.8125rem]">
          <strong>Caminho alternativo:</strong> {point.alternative}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {point.audiences.map((audience) => (
          <Badge key={audience} color="neutral">
            {ACCESS_AUDIENCE_LABEL[audience]}
          </Badge>
        ))}
      </div>

      <ButtonLink
        to={paths.mapFocus('accessibility', point.id)}
        variant="secondary"
        size="sm"
        className="self-start"
      >
        Ver no mapa
      </ButtonLink>
    </li>
  )
}

function PathTab({ pointId }: { pointId: string | null }) {
  const prefs = useAccessibilityPreferences()
  const [search, setSearch] = useState('')
  const [nature, setNature] = useState<NatureFilter>('all')
  const [audience, setAudience] = useState<AccessAudience | ''>(() => {
    // Com um ponto em foco, nenhum filtro pode escondê-lo.
    if (pointId) return ''
    if (prefs.highlights.includes('audio_tactile')) return 'blind'
    if (prefs.highlights.includes('step_free')) return 'wheelchair'
    return ''
  })

  const points = useQuery({
    queryKey: ['mobility', 'points', nature, audience, search],
    queryFn: () =>
      repos.mobility.listAccessPoints({
        nature: nature === 'all' ? undefined : nature,
        audience: audience || undefined,
        search,
      }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-700 text-sm">
        Escadas, degraus e outros obstáculos — e também rampas, elevadores, piso tátil e semáforos
        sonoros. Os pontos aparecem do mais perto ao mais distante.
      </p>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por rua, bairro ou tipo…"
        label="Buscar barreiras e apoios"
      />
      <FilterChips
        ariaLabel="Mostrar barreiras ou apoios"
        options={NATURE_FILTERS}
        value={nature}
        onChange={setNature}
      />
      <Select
        aria-label="Mostrar o que é importante para"
        value={audience}
        onChange={(event) => setAudience(event.target.value as AccessAudience | '')}
      >
        <option value="">Importante para: todas as pessoas</option>
        {AUDIENCES.map((key) => (
          <option key={key} value={key}>
            Importante para: {ACCESS_AUDIENCE_LABEL[key].toLowerCase()}
          </option>
        ))}
      </Select>

      <AsyncView
        query={points}
        empty={
          <EmptyState
            icon={Footprints}
            title="Nenhum ponto encontrado"
            description="Tente outro filtro ou outra palavra na busca."
          />
        }
      >
        {(items) => (
          <>
            <p className="text-ink-600 text-xs" role="status">
              {pluralize(
                items.filter((item) => item.nature === 'barrier').length,
                'barreira',
                'barreiras',
              )}{' '}
              e{' '}
              {pluralize(
                items.filter((item) => item.nature === 'support').length,
                'apoio',
                'apoios',
              )}
            </p>
            <ul className="flex flex-col gap-3">
              {items.map((point) => (
                <PointCard key={point.id} point={point} highlighted={point.id === pointId} />
              ))}
            </ul>
          </>
        )}
      </AsyncView>

      <Card tone="soft" className="flex flex-col items-start gap-2">
        <p className="text-ink-900 text-sm font-bold">Encontrou uma barreira que não está aqui?</p>
        <p className="text-ink-700 text-[0.8125rem]">
          Registre uma demanda na categoria Acessibilidade: ela aparece no mapa e pode ser apoiada
          por outros moradores.
        </p>
        <ButtonLink to={paths.newDemand} size="sm" leftIcon={<Megaphone className="size-4" />}>
          Registrar demanda
        </ButtonLink>
      </Card>

      <Callout tone="demo" title="Dados demonstrativos">
        {DEMO_NOTE}
      </Callout>
    </div>
  )
}

// ── Alertas de proximidade ───────────────────────────────────────────────────

type TrackingState = 'off' | 'starting' | 'on' | 'denied' | 'unavailable' | 'outside'

/** Intervalo entre os passos da caminhada simulada. */
const SIMULATION_STEP_MS = 1600

function AlertsTab() {
  const prefs = useAccessibilityPreferences()
  const barriers = useQuery({
    queryKey: ['mobility', 'points', 'barrier'],
    queryFn: () => repos.mobility.listAccessPoints({ nature: 'barrier' }),
  })
  const list = useMemo(() => barriers.data ?? [], [barriers.data])

  const [tracking, setTracking] = useState<TrackingState>('off')
  const [simulating, setSimulating] = useState(false)
  const [nearest, setNearest] = useState<ProximityHit | null>(null)
  const [alert, setAlert] = useState<ProximityHit | null>(null)
  const alerted = useRef<Set<string>>(new Set())
  const watchId = useRef<number | null>(null)
  const timer = useRef<number | null>(null)

  /** Mesma regra para a posição real e para a simulada. */
  const evaluate = (position: GeoPoint) => {
    alerted.current = forgetDistantAlerts(list, position, alerted.current)
    setNearest(nearestBarrier(list, position))
    const [hit] = findProximityAlerts(list, position, alerted.current)
    if (!hit) return
    alerted.current.add(hit.point.id)
    setAlert(hit)
    signalAlert(describeProximityAlert(hit.point, hit.meters))
  }
  const evaluateRef = useRef(evaluate)
  useEffect(() => {
    evaluateRef.current = evaluate
  })

  const stopTracking = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    setTracking('off')
  }

  const stopSimulation = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    setSimulating(false)
  }

  // Ao sair da tela, o acompanhamento, a simulação e a fala param.
  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      if (timer.current !== null) window.clearInterval(timer.current)
      stopSpeaking()
    },
    [],
  )

  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setTracking('unavailable')
      return
    }
    stopSimulation()
    alerted.current = new Set()
    setAlert(null)
    setTracking('starting')
    // Fala dentro do toque: confirma a ação e libera a voz para os alertas que virão.
    playSound('on', { force: true })
    speak('Acompanhamento ligado. Vou avisar quando houver uma barreira por perto.', {
      interrupt: true,
    })
    watchId.current = navigator.geolocation.watchPosition(
      (result) => {
        const position = { lat: result.coords.latitude, lng: result.coords.longitude }
        if (!isWithinDemoArea(position)) {
          setTracking('outside')
          setNearest(null)
          return
        }
        setTracking('on')
        evaluateRef.current(position)
      },
      (error) => {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
        setTracking(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    )
  }

  const startSimulation = () => {
    const steps = buildSimulatedWalk(list)
    if (steps.length === 0) return
    stopTracking()
    alerted.current = new Set()
    setAlert(null)
    setSimulating(true)
    playSound('on', { force: true })
    // Fala dentro do toque: confirma a ação e libera a voz para os alertas que virão.
    speak('Simulação iniciada. Vou avisar quando houver uma barreira por perto.', {
      interrupt: true,
    })
    let index = 0
    let waited = 0
    const advance = () => {
      const step = steps[index]
      if (!step) {
        stopSimulation()
        return
      }
      // Antes de seguir para a barreira seguinte, espera o alerta anterior terminar de
      // ser falado (com limite, porque alguns navegadores não avisam o fim da fala).
      const previous = steps[index - 1]
      if (previous && previous.target.id !== step.target.id && isSpeaking() && waited < 8) {
        waited += 1
        return
      }
      waited = 0
      evaluateRef.current(step.position)
      index += 1
    }
    advance()
    timer.current = window.setInterval(advance, SIMULATION_STEP_MS)
  }

  const trackingMessage: Record<TrackingState, string> = {
    off: 'O acompanhamento está parado.',
    starting: 'Obtendo a sua localização…',
    on: 'Acompanhando a sua posição. Mantenha esta tela aberta.',
    denied:
      'O acesso à localização foi negado. Autorize a localização para este site nas configurações do navegador.',
    unavailable: 'Não foi possível obter a localização neste aparelho agora.',
    outside:
      'Você está fora da cidade de demonstração, onde ficam as barreiras cadastradas. Use a simulação para conhecer os alertas.',
  }
  const active = tracking === 'starting' || tracking === 'on' || tracking === 'outside'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-700 text-sm">
        Ao se aproximar de uma escada, de um degrau ou de outro obstáculo (a menos de{' '}
        {ALERT_RADIUS_METERS} metros), o NEXA avisa por <strong>voz</strong>, <strong>som</strong> e{' '}
        <strong>vibração</strong> e sugere um caminho alternativo.
      </p>

      {alert && (
        <div
          role="alert"
          className="bg-terracotta-600 rounded-card flex flex-col gap-1.5 p-5 text-white"
        >
          <p className="flex items-center gap-2 text-[0.8125rem] font-bold tracking-wide uppercase">
            <TriangleAlert className="size-5" aria-hidden />
            {ACCESS_POINT_KIND_LABEL[alert.point.kind]} a {formatDistance(alert.meters)}
          </p>
          <p className="text-xl leading-tight font-extrabold">{alert.point.title}</p>
          <p className="text-sm">{alert.point.description}</p>
          {alert.point.alternative && (
            <p className="mt-1 rounded-2xl bg-white/15 px-3 py-2 text-sm">
              <strong>Caminho alternativo:</strong> {alert.point.alternative}
            </p>
          )}
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <IconTile icon={Play} color="orange" />
          <div className="min-w-0 flex-1">
            <h2 className="text-ink-900 text-[0.9375rem] font-bold">Simular um percurso</h2>
            <p className="text-ink-600 text-[0.8125rem]">
              Uma caminhada de demonstração passa perto de três barreiras, para você ouvir e sentir
              como são os alertas.
            </p>
          </div>
        </div>
        <Button
          variant={simulating ? 'secondary' : 'primary'}
          disabled={list.length === 0}
          leftIcon={simulating ? <Square className="size-4" /> : <Play className="size-4" />}
          onClick={simulating ? stopSimulation : startSimulation}
        >
          {simulating ? 'Parar a simulação' : 'Iniciar a simulação'}
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <IconTile icon={LocateFixed} color="teal" />
          <div className="min-w-0 flex-1">
            <h2 className="text-ink-900 text-[0.9375rem] font-bold">Usar a minha localização</h2>
            <p className="text-ink-600 text-[0.8125rem]">
              A posição é usada apenas nesta tela, para medir a distância até as barreiras. Ela não
              é guardada nem enviada.
            </p>
          </div>
        </div>
        <p className="text-ink-800 text-[0.8125rem] font-semibold" role="status" aria-live="polite">
          {trackingMessage[tracking]}
          {prefs.proximityAlerts && tracking === 'off' && (
            <span className="text-ink-600 block font-normal">
              Você pediu alertas de barreiras: toque no botão abaixo para começar a acompanhar.
            </span>
          )}
        </p>
        <Button
          variant="secondary"
          leftIcon={active ? <Square className="size-4" /> : <LocateFixed className="size-4" />}
          onClick={active ? stopTracking : startTracking}
        >
          {active ? 'Parar de acompanhar' : 'Ativar com a minha localização'}
        </Button>
      </Card>

      {nearest && (simulating || tracking === 'on') && (
        <p className="text-ink-800 text-sm" role="status" aria-live="polite">
          Barreira mais próxima: <strong>{nearest.point.title}</strong>, a{' '}
          <strong>{formatDistance(nearest.meters)}</strong>
          {simulating ? ' (posição simulada).' : '.'}
        </p>
      )}

      <Card padding="none" className="px-4">
        <SwitchRow
          title="Alertas de barreiras no caminho"
          description="Liga o acompanhamento com a sua localização, mostra as barreiras no mapa e lembra esta escolha no aparelho."
          checked={prefs.proximityAlerts}
          onChange={(checked) => {
            updatePreferences({ proximityAlerts: checked })
            // O acompanhamento começa aqui, dentro do toque (o navegador pede a localização).
            if (checked) startTracking()
            else {
              stopTracking()
              playSound('off')
            }
          }}
        />
      </Card>

      <Callout tone="demo" title="Limites desta demonstração">
        As barreiras são fictícias e ficam na cidade de demonstração. Os alertas funcionam com esta
        tela aberta: o navegador não permite acompanhar a posição com o aplicativo fechado. Eles não
        substituem a bengala, o cão-guia nem a atenção ao caminho.
      </Callout>
    </div>
  )
}

/**
 * Mobilidade acessível: ônibus com recursos de acessibilidade, barreiras e apoios no
 * caminho e alertas de proximidade por voz, som e vibração.
 */
export default function MobilityPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('aba') as MobilityTab | null
  const tab: MobilityTab =
    TABS.some((item) => item.value === requested) && requested ? requested : 'onibus'

  return (
    <>
      <PageHeader
        title="Mobilidade acessível"
        variant="stack"
        backTo={paths.home}
        actions={<DemoBadge label="Demo" />}
      >
        <SegmentedControl
          ariaLabel="Seções da mobilidade acessível"
          options={TABS}
          value={tab}
          onChange={(next) => setParams({ aba: next }, { replace: true })}
          className="flex w-full"
        />
      </PageHeader>
      <Page>
        {tab === 'onibus' && (
          <BusesTab lineId={params.get('linha')} stopId={params.get('parada')} />
        )}
        {tab === 'caminho' && <PathTab pointId={params.get('ponto')} />}
        {tab === 'alertas' && <AlertsTab />}
      </Page>
    </>
  )
}
