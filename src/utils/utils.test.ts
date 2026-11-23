import { describe, expect, it } from 'vitest'

import type { WeekSchedule } from '@/types'

import { setClock } from './clock'
import {
  dateBadgeParts,
  formatEventTimeRange,
  previousRange,
  rangeDays,
  rangeForPreset,
  timeAgo,
} from './dates'
import {
  centsToInput,
  formatChange,
  formatCurrency,
  formatDistance,
  formatRating,
  parseCurrencyInput,
} from './format'
import { approximatePoint, distanceMeters, offsetPoint } from './geo'
import { hashPassword, validatePassword, verifyPassword } from './password'
import { formatDayHours, isOpenAt } from './schedule'
import { initials, matchesSearch, normalizeText, pluralize, slugify, truncate } from './text'

describe('formatação', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatCurrency(123456)).toBe('R$ 1.234,56')
    expect(formatCurrency(0)).toBe('R$ 0,00')
    expect(formatCurrency(-990)).toBe('-R$ 9,90')
  })

  it('formata distâncias como na referência visual', () => {
    expect(formatDistance(500)).toBe('500 m')
    expect(formatDistance(704)).toBe('700 m')
    expect(formatDistance(1000)).toBe('1 km')
    expect(formatDistance(1240)).toBe('1,2 km')
    expect(formatDistance(null)).toBe('')
  })

  it('formata variações percentuais com sinal', () => {
    expect(formatChange(0.125)).toBe('+12,5%')
    expect(formatChange(-0.3)).toBe('−30%')
    expect(formatChange(0)).toBe('0%')
    expect(formatChange(null)).toBe('—')
  })

  it('formata notas com vírgula', () => {
    expect(formatRating(4.8)).toBe('4,8')
    expect(formatRating(null)).toBe('—')
  })

  it('converte valores digitados em centavos', () => {
    expect(parseCurrencyInput('12,50')).toBe(1250)
    expect(parseCurrencyInput('R$ 1.234,56')).toBe(123456)
    expect(parseCurrencyInput('7')).toBe(700)
    expect(parseCurrencyInput('0,1')).toBe(10)
    expect(parseCurrencyInput('')).toBeNull()
    expect(parseCurrencyInput('abc')).toBeNull()
    expect(parseCurrencyInput('1,234')).toBeNull()
    expect(centsToInput(1250)).toBe('12,50')
  })
})

describe('datas', () => {
  const reference = new Date(2026, 10, 22, 15, 0, 0)

  it('descreve o tempo decorrido no estilo do feed', () => {
    expect(timeAgo(new Date(2026, 10, 22, 14, 59, 40), reference)).toBe('Agora')
    expect(timeAgo(new Date(2026, 10, 22, 14, 15, 0), reference)).toBe('Há 45 min')
    expect(timeAgo(new Date(2026, 10, 22, 13, 0, 0), reference)).toBe('Há 2h')
    expect(timeAgo(new Date(2026, 10, 21, 20, 0, 0), reference)).toBe('Ontem')
    expect(timeAgo(new Date(2026, 10, 19, 9, 0, 0), reference)).toBe('Há 3 dias')
    expect(timeAgo(new Date(2026, 10, 2, 9, 0, 0), reference)).toBe('2 de nov')
  })

  it('monta o selo de data dos eventos', () => {
    expect(dateBadgeParts(new Date(2026, 10, 25, 9, 0, 0))).toMatchObject({
      day: '25',
      month: 'NOV',
    })
  })

  it('descreve o horário de um evento', () => {
    expect(
      formatEventTimeRange(new Date(2026, 10, 25, 9, 0, 0), new Date(2026, 10, 25, 17, 0, 0)),
    ).toBe('Das 9h às 17h')
    expect(
      formatEventTimeRange(new Date(2026, 10, 25, 8, 30, 0), new Date(2026, 10, 25, 14, 0, 0)),
    ).toBe('Das 8h30 às 14h')
  })

  it('calcula períodos e o período anterior equivalente', () => {
    const range = rangeForPreset('7d', reference)
    expect(rangeDays(range)).toBe(7)
    expect(new Date(range.from).getDate()).toBe(16)
    const previous = previousRange(range)
    expect(rangeDays(previous)).toBe(7)
    expect(new Date(previous.to).getDate()).toBe(15)
    expect(new Date(previous.from).getDate()).toBe(9)
  })
})

describe('geolocalização', () => {
  const center = { lat: -19.932, lng: -43.9381 }

  it('mede distâncias com precisão de poucos metros', () => {
    const north = offsetPoint(center, 500, 0)
    const east = offsetPoint(center, 0, 1200)
    expect(distanceMeters(center, north)).toBeGreaterThan(495)
    expect(distanceMeters(center, north)).toBeLessThan(505)
    expect(distanceMeters(center, east)).toBeGreaterThan(1190)
    expect(distanceMeters(center, east)).toBeLessThan(1210)
    expect(distanceMeters(center, center)).toBe(0)
  })

  it('reduz a precisão das coordenadas para preservar a privacidade', () => {
    expect(approximatePoint({ lat: -19.9321234, lng: -43.9387654 }, 3)).toEqual({
      lat: -19.932,
      lng: -43.939,
    })
  })
})

describe('horário de funcionamento', () => {
  const schedule: WeekSchedule = [
    null,
    { open: '07:00', close: '19:00' },
    { open: '07:00', close: '19:00' },
    { open: '07:00', close: '19:00' },
    { open: '07:00', close: '19:00' },
    { open: '18:00', close: '02:00' },
    { open: '08:00', close: '12:00' },
  ]

  it('respeita abertura, fechamento e dias fechados', () => {
    expect(isOpenAt(schedule, new Date(2026, 10, 23, 10, 0))).toBe(true) // segunda
    expect(isOpenAt(schedule, new Date(2026, 10, 23, 6, 59))).toBe(false)
    expect(isOpenAt(schedule, new Date(2026, 10, 23, 19, 0))).toBe(false)
    expect(isOpenAt(schedule, new Date(2026, 10, 22, 10, 0))).toBe(false) // domingo
  })

  it('suporta horários que atravessam a meia-noite', () => {
    expect(isOpenAt(schedule, new Date(2026, 10, 27, 23, 30))).toBe(true) // sexta à noite
    expect(isOpenAt(schedule, new Date(2026, 10, 28, 1, 30))).toBe(true) // madrugada de sábado
    expect(isOpenAt(schedule, new Date(2026, 10, 28, 2, 0))).toBe(false)
  })

  it('usa o relógio da aplicação por padrão', () => {
    setClock(new Date(2026, 10, 23, 10, 0))
    expect(isOpenAt(schedule)).toBe(true)
    setClock(new Date(2026, 10, 23, 22, 0))
    expect(isOpenAt(schedule)).toBe(false)
  })

  it('descreve o horário do dia', () => {
    expect(formatDayHours({ open: '07:00', close: '19:30' })).toBe('7h às 19h30')
    expect(formatDayHours(null)).toBe('Fechado')
  })
})

describe('texto', () => {
  it('normaliza e busca ignorando acentos e maiúsculas', () => {
    expect(normalizeText('  Iluminação   PÚBLICA ')).toBe('iluminacao publica')
    expect(matchesSearch('padaria bairro', 'Padaria do Bairro', 'Alimentação')).toBe(true)
    expect(matchesSearch('farmacia', 'Farmácia Popular')).toBe(true)
    expect(matchesSearch('mercado', 'Padaria do Bairro')).toBe(false)
    expect(matchesSearch('', 'qualquer coisa')).toBe(true)
    expect(matchesSearch(undefined, null)).toBe(true)
  })

  it('oferece utilitários de exibição', () => {
    expect(initials('Antonio Silva')).toBe('AS')
    expect(initials('Maria')).toBe('M')
    expect(pluralize(1, 'apoio', 'apoios')).toBe('1 apoio')
    expect(pluralize(12, 'apoio', 'apoios')).toBe('12 apoios')
    expect(slugify('Ana Costa')).toBe('ana_costa')
    expect(truncate('Mutirão para revitalizar a praça do bairro', 20).endsWith('…')).toBe(true)
    expect(truncate('curto', 20)).toBe('curto')
  })
})

describe('senhas', () => {
  it('nunca guarda a senha em texto puro e valida corretamente', async () => {
    const derived = await hashPassword('nexa1234')
    expect(derived.hash).not.toContain('nexa1234')
    expect(derived.salt.length).toBeGreaterThan(10)
    expect(await verifyPassword('nexa1234', derived)).toBe(true)
    expect(await verifyPassword('nexa12345', derived)).toBe(false)
  })

  it('gera sal diferente a cada derivação', async () => {
    const first = await hashPassword('nexa1234')
    const second = await hashPassword('nexa1234')
    expect(first.salt).not.toBe(second.salt)
    expect(first.hash).not.toBe(second.hash)
  })

  it('aplica a política de senha', () => {
    expect(validatePassword('abc123')).toMatch(/pelo menos 8/)
    expect(validatePassword('abcdefgh')).toMatch(/letras e números/)
    expect(validatePassword('12345678')).toMatch(/letras e números/)
    expect(validatePassword('nexa1234')).toBeNull()
  })
})
