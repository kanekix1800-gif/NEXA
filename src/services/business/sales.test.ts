import { describe, expect, it } from 'vitest'

import type { Product } from '@/types'
import { AppError } from '@/utils/errors'

import {
  checkStock,
  computeSaleTotals,
  isLowStock,
  lineTotalCents,
  mergeSaleItems,
  quantityError,
  roundQuantity,
} from './sales'

function product(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    businessId: 'biz',
    name: overrides.id,
    priceCents: 100,
    trackStock: true,
    stock: 10,
    minStock: 2,
    unit: 'un',
    showInCatalog: true,
    active: true,
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('regras puras de vendas', () => {
  it('arredonda quantidades para 3 casas e calcula o total da linha em centavos inteiros', () => {
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3)
    expect(roundQuantity(1.23456)).toBe(1.235)
    expect(lineTotalCents(3, 250)).toBe(750)
    // 0,333 kg × R$ 19,90 = 662,67 → 663 centavos
    expect(lineTotalCents(0.333, 1990)).toBe(663)
  })

  it('valida quantidades conforme a unidade', () => {
    expect(quantityError(2, 'un')).toBeNull()
    expect(quantityError(1.5, 'kg')).toBeNull()
    expect(quantityError(1.5, 'un')).toMatch(/inteiro/)
    expect(quantityError(0, 'un')).toMatch(/maior que zero/)
    expect(quantityError(0, 'un', { allowZero: true })).toBeNull()
    expect(quantityError(-1, 'kg', { allowZero: true })).toMatch(/negativa/)
    expect(quantityError(0.0001, 'kg')).toMatch(/3 casas/)
    expect(quantityError(Number.NaN, 'kg')).toMatch(/número/)
  })

  it('soma itens repetidos preservando a ordem do primeiro aparecimento', () => {
    expect(
      mergeSaleItems([
        { productId: 'b', quantity: 1 },
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 0.5 },
      ]),
    ).toEqual([
      { productId: 'b', quantity: 1.5 },
      { productId: 'a', quantity: 2 },
    ])
  })

  it('calcula subtotal, desconto e total', () => {
    const lines = [
      { quantity: 3, unitPriceCents: 100 },
      { quantity: 1, unitPriceCents: 2500 },
    ]
    expect(computeSaleTotals(lines)).toEqual({
      subtotalCents: 2800,
      discountCents: 0,
      totalCents: 2800,
    })
    expect(computeSaleTotals(lines, 300)).toEqual({
      subtotalCents: 2800,
      discountCents: 300,
      totalCents: 2500,
    })
  })

  it.each([-1, 10.5, 2801])('recusa desconto inválido (%s)', (discount) => {
    const lines = [
      { quantity: 3, unitPriceCents: 100 },
      { quantity: 1, unitPriceCents: 2500 },
    ]
    try {
      computeSaleTotals(lines, discount)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('validation')
      expect((error as AppError).fieldErrors).toHaveProperty('discountCents')
    }
  })

  it('aponta faltas de estoque apenas para produtos com controle de estoque', () => {
    const products = [
      product({ id: 'bolo', name: 'Bolo', stock: 2 }),
      product({ id: 'cafe', name: 'Café', trackStock: false, stock: 0 }),
      product({ id: 'pao', name: 'Pão', stock: 50 }),
    ]
    const items = [
      { productId: 'bolo', quantity: 2 },
      { productId: 'cafe', quantity: 10 },
      { productId: 'pao', quantity: 5 },
      { productId: 'bolo', quantity: 1 },
    ]
    expect(checkStock(items, products, false)).toEqual([
      { productId: 'bolo', name: 'Bolo', requested: 3, available: 2 },
    ])
    expect(checkStock(items, products, true)).toEqual([])
  })

  it('identifica estoque baixo (ativo, com controle e no mínimo ou abaixo)', () => {
    expect(isLowStock(product({ id: 'a', stock: 2, minStock: 2 }))).toBe(true)
    expect(isLowStock(product({ id: 'b', stock: 3, minStock: 2 }))).toBe(false)
    expect(isLowStock(product({ id: 'c', stock: 0, minStock: 2, active: false }))).toBe(false)
    expect(isLowStock(product({ id: 'd', stock: 0, minStock: 2, trackStock: false }))).toBe(false)
  })
})
