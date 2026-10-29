/** Class recipes shared by the UI components (kept apart so components files only export components). */

/** Shared motion: weighted deceleration, colors and transform only. */
export const MOTION = 'transition duration-300 ease-smooth'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-action text-action-ink hover:bg-action-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-subtle',
  danger: 'border border-red-200 bg-surface text-red-700 hover:bg-red-50',
  ghost: 'text-ink-soft hover:bg-subtle hover:text-ink',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'gap-2 px-3 py-2 text-base',
  sm: 'gap-2 px-3 py-2 text-sm',
}

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'sm'): string {
  return [
    'inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap select-none',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    MOTION,
    VARIANTS[variant],
    SIZES[size],
  ].join(' ')
}

export const CONTROL = [
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint',
  'hover:border-line-strong focus:border-ink focus:outline-none disabled:bg-canvas disabled:text-faint',
  MOTION,
].join(' ')
