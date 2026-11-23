import { FlaskConical } from 'lucide-react'

import { DEMAND_STATUS_COLOR, URGENCY_COLOR } from '@/components/icons/colors'
import { Badge } from '@/components/ui'
import {
  DEMAND_STATUS_LABEL,
  URGENCY_LABEL,
  type Category,
  type DemandStatus,
  type Urgency,
} from '@/types'

/** Selo com o status de uma demanda. */
export function DemandStatusBadge({ status, size }: { status: DemandStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge color={DEMAND_STATUS_COLOR[status]} size={size}>
      {DEMAND_STATUS_LABEL[status]}
    </Badge>
  )
}

/** Selo com o grau de urgência sugerido. */
export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <Badge color={URGENCY_COLOR[urgency]} variant="outline">
      Urgência {URGENCY_LABEL[urgency].toLowerCase()}
    </Badge>
  )
}

/** Selo de categoria (demanda, comércio ou evento). */
export function CategoryBadge({ category }: { category: Pick<Category, 'name' | 'color'> }) {
  return <Badge color={category.color}>{category.name}</Badge>
}

/** Marca atualizações institucionais simuladas (sem integração oficial com o órgão). */
export function SimulatedBadge() {
  return (
    <span className="bg-cream-200 text-ink-700 inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-bold">
      <FlaskConical className="text-sun-600 size-3" aria-hidden />
      Simulação
    </span>
  )
}
