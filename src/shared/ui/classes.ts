/** Class recipes shared by the UI components (kept apart so components files only export components). */
import { MOTION } from '../../components/ui/styles.ts'
import { buttonVariants } from '../../components/ui/variants.ts'

/** Shared motion: weighted deceleration, colors and transform only. */
export { MOTION }

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

/** The button look for elements that are not a <Button> (for example a router link); same recipe as the UI kit. */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'sm'): string {
  return buttonVariants({ variant, size })
}

export const CONTROL = [
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-xs placeholder:text-faint',
  'hover:border-line-strong focus:border-ink focus:outline-none disabled:bg-canvas disabled:text-faint disabled:shadow-none',
  MOTION,
].join(' ')
