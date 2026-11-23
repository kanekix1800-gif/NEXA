import { describe, expect, it } from 'vitest'

import type { AccessPointView, TransitLineView } from '@/types'
import { offsetPoint } from '@/utils/geo'

import {
  describeAccessPoint,
  describeLine,
  describeProximityAlert,
  spokenCode,
  spokenDistance,
  spokenTime,
} from './describe'
import {
  ALERT_RADIUS_METERS,
  buildSimulatedWalk,
  findProximityAlerts,
  forgetDistantAlerts,
  nearestBarrier,
} from './proximity'
import { formatClock, minutesUntilNext, nextDepartures, parseClock } from './schedule'

const ORIGIN = { lat: -19.932, lng: -43.9381 }

function point(id: string, north: number, extra: Partial<AccessPointView> = {}): AccessPointView {
  return {
    id,
    kind: 'stairs',
    title: `Escadaria ${id}`,
    description: 'Escadaria com 20 degraus.',
    addressHint: 'Rua de Teste',
    neighborhoodId: 'nb_centro',
    neighborhoodName: 'Centro',
    location: offsetPoint(ORIGIN, north, 0),
    alternative: 'Use a rampa ao lado.',
    audiences: ['blind', 'wheelchair'],
    checkedAt: '2026-11-18T12:00:00.000Z',
    isDemo: true,
    nature: 'barrier',
    distanceMeters: Math.abs(north),
    ...extra,
  }
}

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 10, 18, hours, minutes, 0, 0)
}

describe('horários das linhas', () => {
  const line = { firstDeparture: '06:00', lastDeparture: '22:00', frequencyMinutes: 30 }

  it('converte e formata horários', () => {
    expect(parseClock('05:30')).toBe(330)
    expect(parseClock('25:00')).toBeNull()
    expect(parseClock('abc')).toBeNull()
    expect(formatClock(330)).toBe('05:30')
  })

  it('calcula as próximas partidas a partir da hora atual', () => {
    expect(nextDepartures(line, at(12, 0))).toEqual(['12:00', '12:30', '13:00'])
    expect(nextDepartures(line, at(12, 1))).toEqual(['12:30', '13:00', '13:30'])
    // Antes do início da operação, mostra as primeiras partidas do dia.
    expect(nextDepartures(line, at(4, 0))).toEqual(['06:00', '06:30', '07:00'])
    // Perto do fim, só as que ainda existem.
    expect(nextDepartures(line, at(21, 45))).toEqual(['22:00'])
    expect(nextDepartures(line, at(22, 1))).toEqual([])
  })

  it('ignora horários inválidos em vez de inventar partidas', () => {
    expect(nextDepartures({ ...line, frequencyMinutes: 0 }, at(12))).toEqual([])
    expect(nextDepartures({ ...line, firstDeparture: 'xx' }, at(12))).toEqual([])
    expect(nextDepartures({ ...line, lastDeparture: '05:00' }, at(12))).toEqual([])
  })

  it('informa quantos minutos faltam para a próxima partida', () => {
    expect(minutesUntilNext(line, at(12, 10))).toBe(20)
    expect(minutesUntilNext(line, at(23, 0))).toBeNull()
  })
})

describe('alertas de proximidade', () => {
  const near = point('a', 30)
  const far = point('b', 400)
  const support = point('c', 10, { nature: 'support', kind: 'ramp' })

  it('avisa só sobre barreiras dentro do raio, da mais próxima à mais distante', () => {
    const hits = findProximityAlerts([far, near, support], ORIGIN, new Set())
    expect(hits.map((hit) => hit.point.id)).toEqual(['a'])
    expect(hits[0]!.meters).toBeLessThanOrEqual(ALERT_RADIUS_METERS)
  })

  it('não repete o aviso de uma barreira já anunciada', () => {
    expect(findProximityAlerts([near], ORIGIN, new Set(['a']))).toEqual([])
  })

  it('volta a avisar depois que a pessoa se afasta e retorna', () => {
    const away = offsetPoint(ORIGIN, 300, 0)
    expect(forgetDistantAlerts([near], away, new Set(['a']))).toEqual(new Set())
    // Ainda por perto: continua marcada como já anunciada.
    expect(forgetDistantAlerts([near], ORIGIN, new Set(['a']))).toEqual(new Set(['a']))
  })

  it('encontra a barreira mais próxima, ignorando os apoios', () => {
    expect(nearestBarrier([far, near, support], ORIGIN)?.point.id).toBe('a')
    expect(nearestBarrier([support], ORIGIN)).toBeNull()
  })

  it('a caminhada simulada se aproxima de cada barreira até disparar o alerta', () => {
    const steps = buildSimulatedWalk([near, far, support])
    expect(new Set(steps.map((step) => step.target.id))).toEqual(new Set(['a', 'b']))
    const alerted = new Set<string>()
    const announced: string[] = []
    for (const step of steps) {
      for (const hit of findProximityAlerts([near, far], step.position, alerted)) {
        alerted.add(hit.point.id)
        announced.push(hit.point.id)
      }
    }
    expect(announced).toEqual(['a', 'b'])
    // Os passos chegam cada vez mais perto.
    const toFirst = steps.filter((step) => step.target.id === 'a').map((step) => step.meters)
    expect(toFirst).toEqual([...toFirst].sort((x, y) => y - x))
  })
})

describe('textos falados', () => {
  it('diz distâncias, horários e números de linha por extenso', () => {
    expect(spokenDistance(120)).toBe('120 metros')
    expect(spokenDistance(1000)).toBe('1 quilômetro')
    expect(spokenDistance(2400)).toBe('2,4 quilômetros')
    expect(spokenTime('06:00')).toBe('6 horas')
    expect(spokenTime('01:00')).toBe('1 hora')
    expect(spokenTime('05:30')).toBe('5 e 30')
    expect(spokenCode('101')).toBe('1 0 1')
  })

  it('descreve uma barreira com o caminho alternativo e para quem ela importa', () => {
    const text = describeAccessPoint(point('a', 80, { title: 'Escadaria do Mirante' }))
    expect(text).toContain('Atenção: Escadaria.')
    expect(text).toContain('Escadaria do Mirante, Rua de Teste, Centro.')
    expect(text).toContain('A 80 metros de você.')
    expect(text).toContain('Caminho alternativo: Use a rampa ao lado.')
    expect(text).toContain('Importante para: pessoas cegas e cadeira de rodas.')
  })

  it('monta um alerta curto para ser ouvido andando', () => {
    expect(describeProximityAlert(point('a', 30), 30)).toBe(
      'Atenção: escadaria a 30 metros. Escadaria a. Use a rampa ao lado.',
    )
  })

  it('descreve uma linha sem símbolos que soam mal na voz', () => {
    const line: TransitLineView = {
      id: 'lin_101',
      code: '101',
      name: 'Vila Esperança ⇄ Centro',
      stopIds: ['s1', 's2'],
      fleet: 'all',
      features: ['lift', 'audio_announcements'],
      frequencyMinutes: 15,
      firstDeparture: '05:30',
      lastDeparture: '23:00',
      isDemo: true,
      stops: [
        {
          id: 's1',
          name: 'Rua das Acácias',
          addressHint: 'Rua das Acácias, 100',
          neighborhoodId: 'nb_vila',
          neighborhoodName: 'Vila Esperança',
          location: ORIGIN,
          features: [],
        },
        {
          id: 's2',
          name: 'Terminal Central',
          addressHint: 'Avenida Principal, 100',
          neighborhoodId: 'nb_centro',
          neighborhoodName: 'Centro',
          location: ORIGIN,
          features: ['shelter'],
        },
      ],
      neighborhoodNames: ['Vila Esperança', 'Centro'],
      nextDepartures: ['12:00', '12:15'],
      accessible: true,
    }
    const text = describeLine(line)
    expect(text).toContain('Linha 1 0 1, Vila Esperança e Centro.')
    expect(text).not.toContain('⇄')
    expect(text).toContain('Todos os ônibus acessíveis.')
    expect(text).toContain('Próximas partidas: 12 horas e 12 e 15.')
    expect(text).toContain('Paradas: Rua das Acácias e Terminal Central.')
    expect(describeLine({ ...line, nextDepartures: [] })).toContain('Não há mais partidas hoje.')
  })
})
