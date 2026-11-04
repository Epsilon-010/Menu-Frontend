import { cva, type VariantProps } from 'class-variance-authority'
import { FOCUS_RING, MOTION } from './styles.ts'

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap select-none',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
    MOTION,
    FOCUS_RING,
  ],
  {
    variants: {
      variant: {
        primary: 'bg-action text-action-ink shadow-sm hover:bg-action-hover',
        secondary: 'border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-subtle',
        danger: 'border border-red-200 bg-surface text-red-700 shadow-xs hover:border-red-300 hover:bg-red-50',
        ghost: 'text-ink-soft hover:bg-subtle hover:text-ink',
      },
      size: {
        md: 'px-3 py-2 text-base',
        sm: 'px-3 py-2 text-sm',
        icon: 'size-9 p-2',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'sm' },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-subtle text-ink-soft',
        solid: 'bg-action text-action-ink',
        outline: 'border border-line text-ink-soft',
        success: 'bg-emerald-50 text-emerald-800',
        warning: 'bg-amber-50 text-amber-900',
        danger: 'bg-red-50 text-red-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BadgeVariantProps = VariantProps<typeof badgeVariants>

/** A segmented control: a sunken track with the chosen option raised on it. */
export const toggleGroupVariants = cva('items-stretch gap-1 rounded-xl border border-line bg-subtle p-1', {
  variants: { width: { fit: 'inline-flex', full: 'flex w-full' } },
  defaultVariants: { width: 'fit' },
})

export const toggleGroupItemVariants = cva(
  [
    'inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-1 text-center text-sm font-semibold select-none',
    'text-muted hover:text-ink active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
    'data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-sm',
    MOTION,
    FOCUS_RING,
  ],
  {
    variants: { width: { fit: '', full: 'flex-1' } },
    defaultVariants: { width: 'fit' },
  },
)
