import { Slot } from '@radix-ui/react-slot'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'
import { buttonVariants, type ButtonVariantProps } from './variants.ts'

interface ButtonProps extends ComponentProps<'button'>, ButtonVariantProps {
  /** Renders the single child (for example a link) with the button look instead of a <button>. */
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
