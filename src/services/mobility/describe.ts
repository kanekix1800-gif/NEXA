import {
  ACCESS_AUDIENCE_LABEL,
  ACCESS_POINT_KIND_LABEL,
  FLEET_ACCESSIBILITY_LABEL,
  STOP_FEATURE_LABEL,
  TRANSIT_FEATURE_LABEL,
  type AccessPointView,
  type TransitLineView,
  type TransitStopView,
} from '@/types'
import { formatDistance } from '@/utils/format'

/**
 * TEXTOS FALADOS DA MOBILIDADE
 * Frases completas, em ordem natural de escuta, usadas pela leitura em voz alta e
 * pelos alertas de proximidade. Evitam símbolos e abreviações que soam mal na voz.
 */

function list(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

/** Distância por extenso: "500 metros", "1,2 quilômetros". */
export function spokenDistance(meters: number): string {
  const text = formatDistance(meters)
  if (text.endsWith(' km')) {
    const value = text.slice(0, -3)
    return `${value} ${value === '1' ? 'quilômetro' : 'quilômetros'}`
  }
  return text.replace(/ m$/, ' metros')
}

/** Horário por extenso: "05:30" → "5 e 30"; "06:00" → "6 horas". */
export function spokenTime(time: string): string {
  const [hours = '0', minutes = '0'] = time.split(':')
  const hour = Number(hours)
  const minute = Number(minutes)
  if (minute === 0) return `${hour} ${hour === 1 ? 'hora' : 'horas'}`
  return `${hour} e ${minute}`
}

/** Número de linha dito algarismo por algarismo: "101" → "1 0 1". */
export function spokenCode(code: string): string {
  return code.split('').join(' ')
}

export function describeAccessPoint(point: AccessPointView): string {
  const parts = [
    `${point.nature === 'barrier' ? 'Atenção' : 'Apoio'}: ${ACCESS_POINT_KIND_LABEL[point.kind]}.`,
    `${point.title}, ${point.addressHint}, ${point.neighborhoodName}.`,
    `A ${spokenDistance(point.distanceMeters)} de você.`,
    point.description,
  ]
  if (point.alternative) parts.push(`Caminho alternativo: ${point.alternative}`)
  if (point.audiences.length > 0) {
    const audiences = point.audiences.map((audience) =>
      ACCESS_AUDIENCE_LABEL[audience].toLowerCase(),
    )
    parts.push(`Importante para: ${list(audiences)}.`)
  }
  return parts.join(' ')
}

/** Alerta curto, para ser ouvido andando. */
export function describeProximityAlert(point: AccessPointView, meters: number): string {
  const kind = ACCESS_POINT_KIND_LABEL[point.kind].toLowerCase()
  const alert = `Atenção: ${kind} a ${spokenDistance(meters)}. ${point.title}.`
  return point.alternative ? `${alert} ${point.alternative}` : alert
}

export function describeLine(line: TransitLineView): string {
  const parts = [
    `Linha ${spokenCode(line.code)}, ${line.name.replace('⇄', 'e')}.`,
    `${FLEET_ACCESSIBILITY_LABEL[line.fleet]}.`,
  ]
  if (line.features.length > 0) {
    const features = line.features.map((feature) => TRANSIT_FEATURE_LABEL[feature].toLowerCase())
    parts.push(`Recursos: ${list(features)}.`)
  }
  parts.push(
    line.nextDepartures.length > 0
      ? `Próximas partidas: ${list(line.nextDepartures.map(spokenTime))}.`
      : 'Não há mais partidas hoje.',
  )
  parts.push(`Paradas: ${list(line.stops.map((stop) => stop.name))}.`)
  if (line.note) parts.push(line.note)
  return parts.join(' ')
}

export function describeStop(stop: TransitStopView): string {
  const parts = [
    `Parada ${stop.name}, ${stop.addressHint}, ${stop.neighborhoodName}.`,
    `A ${spokenDistance(stop.distanceMeters)} de você.`,
  ]
  if (stop.features.length > 0) {
    const features = stop.features.map((feature) => STOP_FEATURE_LABEL[feature].toLowerCase())
    parts.push(`Recursos: ${list(features)}.`)
  } else {
    parts.push('Parada sem abrigo e sem piso tátil.')
  }
  if (stop.lines.length > 0) {
    parts.push(`Linhas: ${list(stop.lines.map((line) => spokenCode(line.code)))}.`)
  }
  return parts.join(' ')
}
