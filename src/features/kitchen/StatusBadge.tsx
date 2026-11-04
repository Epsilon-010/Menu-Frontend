import { CheckCircleIcon, CheckIcon, ClockIcon, FireIcon, ProhibitIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Badge } from '../../components/ui/badge.tsx'
import type { BadgeVariantProps } from '../../components/ui/variants.ts'
import type { OrderItemStatus } from '../ordering/api.ts'
import { staffItemLabel } from './logic.ts'

const LOOKS: Record<OrderItemStatus, { variant: BadgeVariantProps['variant']; icon: ReactNode }> = {
  queued: { variant: 'outline', icon: <ClockIcon size={14} aria-hidden /> },
  preparing: { variant: 'warning', icon: <FireIcon size={14} aria-hidden /> },
  ready: { variant: 'success', icon: <CheckCircleIcon size={14} weight="fill" aria-hidden /> },
  delivered: { variant: 'default', icon: <CheckIcon size={14} aria-hidden /> },
  cancelled: { variant: 'danger', icon: <ProhibitIcon size={14} aria-hidden /> },
}

/** The state of a dish for the staff: a color, an icon and its name, so color is never the only cue. */
export function StatusBadge({ status, className }: { status: OrderItemStatus; className?: string }) {
  const look = LOOKS[status]
  return (
    <Badge variant={look.variant} className={className}>
      {look.icon}
      {staffItemLabel(status)}
    </Badge>
  )
}
