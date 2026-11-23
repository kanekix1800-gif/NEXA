import { config } from '@/config'
import type { GeoPoint } from '@/types'

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Desloca um ponto em metros (norte/leste positivos).
 * Usado para gerar os pontos demonstrativos em torno do centro configurado do mapa.
 */
export function offsetPoint(origin: GeoPoint, northMeters: number, eastMeters: number): GeoPoint {
  const dLat = (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI)
  const dLng =
    (eastMeters / (EARTH_RADIUS_METERS * Math.cos(toRadians(origin.lat)))) * (180 / Math.PI)
  return {
    lat: roundTo(origin.lat + dLat, 6),
    lng: roundTo(origin.lng + dLng, 6),
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Reduz a precisão de uma coordenada (privacidade).
 * 3 casas ≈ 110 m; 4 casas ≈ 11 m. Usamos 4 casas para locais de problemas em vias públicas
 * e 3 casas para qualquer posição obtida do dispositivo do usuário.
 */
export function approximatePoint(point: GeoPoint, decimals = 4): GeoPoint {
  return { lat: roundTo(point.lat, decimals), lng: roundTo(point.lng, decimals) }
}

/** Verifica se o ponto está dentro da área de demonstração (raio em torno do centro do mapa). */
export function isWithinDemoArea(point: GeoPoint): boolean {
  return distanceMeters(point, config.map.center) <= config.map.areaRadiusKm * 1000
}

export function isValidGeoPoint(point: unknown): point is GeoPoint {
  if (typeof point !== 'object' || point === null) return false
  const { lat, lng } = point as Record<string, unknown>
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  )
}

/** Texto curto para exibir uma coordenada aproximada. */
export function formatCoordinates(point: GeoPoint): string {
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`
}
