import type { AccessPointView, GeoPoint } from '@/types'
import { distanceMeters, offsetPoint } from '@/utils/geo'

/**
 * ALERTAS DE PROXIMIDADE
 * Regras puras (sem GPS nem voz) que decidem quando avisar sobre uma barreira.
 * A mesma lógica vale para a localização real do aparelho e para a simulação.
 */

/** Distância, em metros, a partir da qual a barreira é anunciada. */
export const ALERT_RADIUS_METERS = 45

export interface ProximityHit {
  point: AccessPointView
  /** Distância atual até a barreira, em metros. */
  meters: number
}

function hitsFrom(barriers: AccessPointView[], position: GeoPoint): ProximityHit[] {
  return barriers
    .filter((point) => point.nature === 'barrier')
    .map((point) => ({ point, meters: Math.round(distanceMeters(position, point.location)) }))
    .sort((a, b) => a.meters - b.meters)
}

/** Barreira mais próxima da posição (ou `null` se não houver barreiras). */
export function nearestBarrier(
  barriers: AccessPointView[],
  position: GeoPoint,
): ProximityHit | null {
  return hitsFrom(barriers, position)[0] ?? null
}

/**
 * Barreiras dentro do raio de alerta que ainda não foram anunciadas, da mais próxima
 * à mais distante. `alerted` guarda os IDs já avisados, para não repetir o aviso a
 * cada atualização da posição.
 */
export function findProximityAlerts(
  barriers: AccessPointView[],
  position: GeoPoint,
  alerted: ReadonlySet<string>,
  radius = ALERT_RADIUS_METERS,
): ProximityHit[] {
  return hitsFrom(barriers, position).filter(
    (hit) => hit.meters <= radius && !alerted.has(hit.point.id),
  )
}

/**
 * Depois que a pessoa se afasta, a barreira pode ser anunciada de novo em uma
 * próxima passagem. Devolve os IDs que continuam "já avisados".
 */
export function forgetDistantAlerts(
  barriers: AccessPointView[],
  position: GeoPoint,
  alerted: ReadonlySet<string>,
  radius = ALERT_RADIUS_METERS,
): Set<string> {
  const near = new Set(
    hitsFrom(barriers, position)
      .filter((hit) => hit.meters <= radius * 2)
      .map((hit) => hit.point.id),
  )
  return new Set([...alerted].filter((id) => near.has(id)))
}

export interface SimulatedStep {
  position: GeoPoint
  /** Barreira da qual o percurso está se aproximando. */
  target: AccessPointView
  meters: number
}

/** Distâncias, em metros, de cada passo da caminhada simulada até a barreira. */
const APPROACH = [140, 105, 75, 50, 30, 12]

/**
 * Percurso de demonstração: aproxima-se, passo a passo, das barreiras informadas
 * (até três), como se a pessoa caminhasse em direção a cada uma.
 */
export function buildSimulatedWalk(barriers: AccessPointView[], limit = 3): SimulatedStep[] {
  return barriers
    .filter((point) => point.nature === 'barrier')
    .slice(0, limit)
    .flatMap((target) =>
      APPROACH.map((meters) => ({
        position: offsetPoint(target.location, -meters, 0),
        target,
        meters,
      })),
    )
}
