import { nextDepartures } from '@/services/mobility/schedule'
import {
  ACCESS_POINT_KIND_LABEL,
  isBarrierKind,
  STOP_FEATURE_LABEL,
  TRANSIT_FEATURE_LABEL,
  type AccessPoint,
  type AccessPointView,
  type Database,
  type GeoPoint,
  type TransitLine,
  type TransitLineView,
  type TransitStop,
  type TransitStopView,
} from '@/types'
import { now } from '@/utils/clock'
import { distanceMeters } from '@/utils/geo'
import { matchesSearch } from '@/utils/text'

import type { MobilityRepository } from '../contracts'
import {
  neighborhoodName,
  referencePoint,
  requireRecord,
  requireUser,
  type LocalContext,
} from './context'

function isAccessible(line: TransitLine): boolean {
  return line.fleet !== 'none'
}

function toLineView(db: Database, line: TransitLine, current: Date): TransitLineView {
  const stops = line.stopIds
    .map((id) => db.transitStops.find((stop) => stop.id === id))
    .filter((stop): stop is TransitStop => stop !== undefined)
    .map((stop) => ({ ...stop, neighborhoodName: neighborhoodName(db, stop.neighborhoodId) }))
  return {
    ...line,
    stops,
    neighborhoodNames: [...new Set(stops.map((stop) => stop.neighborhoodName).filter(Boolean))],
    nextDepartures: nextDepartures(line, current),
    accessible: isAccessible(line),
  }
}

function toStopView(db: Database, stop: TransitStop, origin: GeoPoint): TransitStopView {
  return {
    ...stop,
    neighborhoodName: neighborhoodName(db, stop.neighborhoodId),
    lines: db.transitLines
      .filter((line) => line.stopIds.includes(stop.id))
      .map((line) => ({
        id: line.id,
        code: line.code,
        name: line.name,
        accessible: isAccessible(line),
      })),
    distanceMeters: Math.round(distanceMeters(origin, stop.location)),
  }
}

function toPointView(db: Database, point: AccessPoint, origin: GeoPoint): AccessPointView {
  return {
    ...point,
    neighborhoodName: neighborhoodName(db, point.neighborhoodId),
    nature: isBarrierKind(point.kind) ? 'barrier' : 'support',
    distanceMeters: Math.round(distanceMeters(origin, point.location)),
  }
}

/** Linhas acessíveis primeiro; dentro de cada grupo, pelo número da linha. */
function byAccessibilityThenCode(a: TransitLine, b: TransitLine): number {
  const rank = { all: 0, partial: 1, none: 2 } as const
  return rank[a.fleet] - rank[b.fleet] || a.code.localeCompare(b.code, 'pt-BR', { numeric: true })
}

export function createMobilityRepository(ctx: LocalContext): MobilityRepository {
  return {
    async listLines(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireUser(db)
        const current = now()
        return db.transitLines
          .filter((line) => !filters.accessibleOnly || isAccessible(line))
          .filter((line) =>
            (filters.features ?? []).every((feature) => line.features.includes(feature)),
          )
          .sort(byAccessibilityThenCode)
          .map((line) => toLineView(db, line, current))
          .filter(
            (line) =>
              !filters.neighborhoodId ||
              line.stops.some((stop) => stop.neighborhoodId === filters.neighborhoodId),
          )
          .filter((line) =>
            matchesSearch(
              filters.search,
              line.code,
              line.name,
              ...line.stops.map((stop) => stop.name),
              ...line.neighborhoodNames,
              ...line.features.map((feature) => TRANSIT_FEATURE_LABEL[feature]),
            ),
          )
      })
    },

    async getLine(id) {
      await ctx.latency()
      return ctx.store.read((db) => {
        requireUser(db)
        const line = requireRecord(db.transitLines, id, 'Linha de ônibus não encontrada.')
        return toLineView(db, line, now())
      })
    },

    async listStops(options = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const origin = referencePoint(db, user, options.near)
        return db.transitStops
          .map((stop) => toStopView(db, stop, origin))
          .filter((stop) =>
            matchesSearch(
              options.search,
              stop.name,
              stop.addressHint,
              stop.neighborhoodName,
              ...stop.features.map((feature) => STOP_FEATURE_LABEL[feature]),
            ),
          )
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
      })
    },

    async listAccessPoints(filters = {}) {
      await ctx.latency()
      return ctx.store.read((db) => {
        const user = requireUser(db)
        const origin = referencePoint(db, user, filters.near)
        return db.accessPoints
          .map((point) => toPointView(db, point, origin))
          .filter((point) => !filters.nature || point.nature === filters.nature)
          .filter((point) => !filters.kinds?.length || filters.kinds.includes(point.kind))
          .filter((point) => !filters.audience || point.audiences.includes(filters.audience))
          .filter(
            (point) => !filters.neighborhoodId || point.neighborhoodId === filters.neighborhoodId,
          )
          .filter((point) =>
            matchesSearch(
              filters.search,
              point.title,
              point.description,
              point.addressHint,
              point.neighborhoodName,
              ACCESS_POINT_KIND_LABEL[point.kind],
            ),
          )
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
      })
    },
  }
}
