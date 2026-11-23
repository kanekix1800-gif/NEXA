import { OPEN_DEMAND_STATUSES, type DemandStatus } from '@/types'

/**
 * Regras do ciclo de vida de uma demanda.
 *
 *   Registrada → Em análise → Em andamento → Resolvida → Encerrada
 *
 * Também são permitidos: encerrar a qualquer momento, devolver para análise e
 * reabrir uma demanda resolvida (quando o problema volta a ocorrer).
 * Uma demanda encerrada só pode ser reaberta para análise.
 */
export const DEMAND_STATUS_TRANSITIONS: Record<DemandStatus, DemandStatus[]> = {
  registered: ['in_review', 'in_progress', 'closed'],
  in_review: ['in_progress', 'resolved', 'closed'],
  in_progress: ['in_review', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: ['in_review'],
}

/** Indica se a mudança de status é permitida pelas regras do ciclo de vida. */
export function canTransition(from: DemandStatus, to: DemandStatus): boolean {
  return DEMAND_STATUS_TRANSITIONS[from].includes(to)
}

/** Próximos status possíveis a partir do atual. */
export function allowedTransitions(from: DemandStatus): DemandStatus[] {
  return [...DEMAND_STATUS_TRANSITIONS[from]]
}

/** Demanda ainda em aberto (registrada, em análise ou em andamento). */
export function isOpenStatus(status: DemandStatus): boolean {
  return OPEN_DEMAND_STATUSES.includes(status)
}

/** Gera o protocolo legível de uma demanda: `formatProtocol(2026, 13)` → "NX-2026-0013". */
export function formatProtocol(year: number, sequence: number): string {
  return `NX-${year}-${String(sequence).padStart(4, '0')}`
}
