import { paths } from '@/app/paths'
import {
  ACCESS_POINT_ICON,
  ACCESS_POINT_KIND_LABEL,
  INSTITUTION_CATEGORY_LABEL,
  isBarrierKind,
  PUBLIC_SERVICE_KIND_LABEL,
  type Category,
  type Database,
  type MapLayer,
  type MapPoint,
} from '@/types'
import { now } from '@/utils/clock'
import { formatDayMonth, formatHourCompact } from '@/utils/dates'
import { isOpenAt } from '@/utils/schedule'
import { pluralize, truncate } from '@/utils/text'

import type { MapRepository } from '../contracts'
import { neighborhoodName, requireUser, type LocalContext } from './context'

const ALL_LAYERS: MapLayer[] = [
  'demands',
  'businesses',
  'institutions',
  'events',
  'services',
  'accessibility',
  'transit',
]

function categoryOf(db: Database, id: string): Category | undefined {
  return db.categories.find((category) => category.id === id)
}

function buildPoints(db: Database, layers: ReadonlySet<MapLayer>): MapPoint[] {
  const points: MapPoint[] = []
  const current = now()

  if (layers.has('demands')) {
    for (const demand of db.demands) {
      if (!demand.location || demand.status === 'closed') continue
      const category = categoryOf(db, demand.categoryId)
      points.push({
        id: `demands:${demand.id}`,
        layer: 'demands',
        refId: demand.id,
        title: demand.title,
        categoryLabel: category?.name ?? 'Demanda',
        description: truncate(demand.description, 120),
        addressLabel: demand.addressHint ?? neighborhoodName(db, demand.neighborhoodId),
        location: demand.location,
        icon: category?.icon ?? 'alert',
        color: category?.color ?? 'gray',
        to: paths.demand(demand.id),
        demandStatus: demand.status,
        meta: pluralize(demand.supporterIds.length, 'apoio', 'apoios'),
      })
    }
  }

  if (layers.has('businesses')) {
    for (const business of db.businesses) {
      if (business.status !== 'active') continue
      const category = categoryOf(db, business.categoryId)
      points.push({
        id: `businesses:${business.id}`,
        layer: 'businesses',
        refId: business.id,
        title: business.name,
        categoryLabel: category?.name ?? 'Comércio',
        description: truncate(business.description, 120),
        addressLabel: business.address || neighborhoodName(db, business.neighborhoodId),
        location: business.location,
        icon: category?.icon ?? 'store',
        color: category?.color ?? 'gray',
        to: paths.business(business.id),
        meta: isOpenAt(business.schedule, current) ? 'Aberto agora' : 'Fechado',
      })
    }
  }

  if (layers.has('institutions')) {
    for (const institution of db.institutions) {
      if (!institution.verified || !institution.location) continue
      points.push({
        id: `institutions:${institution.id}`,
        layer: 'institutions',
        refId: institution.id,
        title: institution.name,
        categoryLabel: INSTITUTION_CATEGORY_LABEL[institution.category],
        description: truncate(institution.tagline || institution.description, 120),
        addressLabel: institution.address ?? neighborhoodName(db, institution.neighborhoodId),
        location: institution.location,
        icon: institution.icon,
        color: institution.color,
        to: paths.institution(institution.id),
      })
    }
  }

  if (layers.has('events')) {
    for (const event of db.events) {
      if (event.status !== 'scheduled' || !event.location) continue
      if (new Date(event.endsAt).getTime() <= current.getTime()) continue
      const category = categoryOf(db, event.categoryId)
      points.push({
        id: `events:${event.id}`,
        layer: 'events',
        refId: event.id,
        title: event.title,
        categoryLabel: category?.name ?? 'Evento',
        description: truncate(event.description, 120),
        addressLabel: event.address ?? event.venue ?? neighborhoodName(db, event.neighborhoodId),
        location: event.location,
        icon: category?.icon ?? 'calendar',
        color: category?.color ?? 'gray',
        to: paths.event(event.id),
        meta: `${formatDayMonth(event.startsAt)} às ${formatHourCompact(event.startsAt)}`,
      })
    }
  }

  if (layers.has('services')) {
    for (const service of db.publicServices) {
      points.push({
        id: `services:${service.id}`,
        layer: 'services',
        refId: service.id,
        title: service.name,
        categoryLabel: PUBLIC_SERVICE_KIND_LABEL[service.kind],
        description: truncate(service.description, 120),
        addressLabel: service.address || neighborhoodName(db, service.neighborhoodId),
        location: service.location,
        icon: service.icon,
        color: service.color,
        to: paths.publicService(service.id),
        meta: service.hours,
      })
    }
  }

  if (layers.has('accessibility')) {
    for (const point of db.accessPoints) {
      const barrier = isBarrierKind(point.kind)
      points.push({
        id: `accessibility:${point.id}`,
        layer: 'accessibility',
        refId: point.id,
        title: point.title,
        categoryLabel: ACCESS_POINT_KIND_LABEL[point.kind],
        description: truncate(
          point.alternative ? `${point.description} ${point.alternative}` : point.description,
          160,
        ),
        addressLabel: `${point.addressHint} — ${neighborhoodName(db, point.neighborhoodId)}`,
        location: point.location,
        icon: ACCESS_POINT_ICON[point.kind],
        color: barrier ? 'terracotta' : 'teal',
        to: paths.mobilityPoint(point.id),
        meta: barrier ? 'Barreira no caminho' : 'Apoio à acessibilidade',
      })
    }
  }

  if (layers.has('transit')) {
    for (const stop of db.transitStops) {
      const lines = db.transitLines.filter((line) => line.stopIds.includes(stop.id))
      const accessible = lines.filter((line) => line.fleet !== 'none')
      points.push({
        id: `transit:${stop.id}`,
        layer: 'transit',
        refId: stop.id,
        title: `Parada ${stop.name}`,
        categoryLabel: 'Parada de ônibus',
        description:
          lines.length > 0
            ? `Linhas ${lines.map((line) => line.code).join(', ')}. ${pluralize(accessible.length, 'linha acessível', 'linhas acessíveis')}.`
            : 'Nenhuma linha cadastrada para esta parada.',
        addressLabel: `${stop.addressHint} — ${neighborhoodName(db, stop.neighborhoodId)}`,
        location: stop.location,
        icon: 'bus',
        color: 'blue',
        to: paths.mobilityStop(stop.id),
        meta: stop.features.includes('tactile_paving') ? 'Com piso tátil' : undefined,
      })
    }
  }

  return points
}

export function createMapRepository(ctx: LocalContext): MapRepository {
  return {
    async listPoints(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireUser(db)
        return buildPoints(db, new Set(filters.layers ?? ALL_LAYERS))
      })
    },
  }
}
