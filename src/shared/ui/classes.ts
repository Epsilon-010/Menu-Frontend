/** Class recipes shared by the UI components (kept apart so components files only export components). */
import { FOCUS_RING, MOTION } from '../../components/ui/styles.ts'
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
  // 16px on phones: iOS zooms the whole page into any smaller input.
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink shadow-xs placeholder:text-faint sm:text-sm pointer-coarse:min-h-11',
  'hover:border-line-strong focus:border-ink disabled:bg-canvas disabled:text-faint disabled:shadow-none',
  FOCUS_RING,
  MOTION,
].join(' ')
