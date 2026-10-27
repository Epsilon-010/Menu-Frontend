/** Class recipes shared by the UI components (kept apart so components files only export components). */

/** Shared motion: weighted deceleration, colors and transform only. */
export const MOTION = 'transition duration-300 ease-smooth'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-950 text-white hover:bg-zinc-800',
  secondary: 'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
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
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400',
  'hover:border-zinc-300 focus:border-zinc-950 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400',
  MOTION,
].join(' ')
