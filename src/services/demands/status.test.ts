import { describe, expect, it } from 'vitest'

import { DEMAND_STATUS_ORDER } from '@/types'

import {
  allowedTransitions,
  canTransition,
  DEMAND_STATUS_TRANSITIONS,
  formatProtocol,
  isOpenStatus,
} from './status'

describe('ciclo de vida das demandas', () => {
  it('segue o fluxo principal: registrada → em análise → em andamento → resolvida → encerrada', () => {
    expect(canTransition('registered', 'in_review')).toBe(true)
    expect(canTransition('in_review', 'in_progress')).toBe(true)
    expect(canTransition('in_progress', 'resolved')).toBe(true)
    expect(canTransition('resolved', 'closed')).toBe(true)
  })

  it('não permite pular direto de registrada para resolvida', () => {
    expect(canTransition('registered', 'resolved')).toBe(false)
  })

  it('não permite "mudar" para o mesmo status', () => {
    for (const status of DEMAND_STATUS_ORDER) {
      expect(canTransition(status, status)).toBe(false)
    }
  })

  it('permite encerrar a partir de qualquer status em aberto ou resolvido', () => {
    expect(canTransition('registered', 'closed')).toBe(true)
    expect(canTransition('in_review', 'closed')).toBe(true)
    expect(canTransition('in_progress', 'closed')).toBe(true)
    expect(canTransition('resolved', 'closed')).toBe(true)
  })

  it('permite reabrir: resolvida volta a andamento e encerrada volta à análise', () => {
    expect(canTransition('resolved', 'in_progress')).toBe(true)
    expect(allowedTransitions('closed')).toEqual(['in_review'])
  })

  it('devolve uma cópia das transições (sem expor a tabela interna)', () => {
    const transitions = allowedTransitions('registered')
    transitions.push('resolved')
    expect(DEMAND_STATUS_TRANSITIONS.registered).not.toContain('resolved')
  })

  it('identifica status em aberto', () => {
    expect(isOpenStatus('registered')).toBe(true)
    expect(isOpenStatus('in_review')).toBe(true)
    expect(isOpenStatus('in_progress')).toBe(true)
    expect(isOpenStatus('resolved')).toBe(false)
    expect(isOpenStatus('closed')).toBe(false)
  })

  it('formata o protocolo com ano e sequência de 4 dígitos', () => {
    expect(formatProtocol(2026, 13)).toBe('NX-2026-0013')
    expect(formatProtocol(2026, 1)).toBe('NX-2026-0001')
    expect(formatProtocol(2027, 12345)).toBe('NX-2027-12345')
  })
})
