import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'
import { badgeVariants, type BadgeVariantProps } from './variants.ts'

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & BadgeVariantProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
