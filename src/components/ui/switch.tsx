import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'
import { FOCUS_RING, MOTION } from './styles.ts'

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-xs',
        'data-[state=checked]:bg-action data-[state=unchecked]:bg-line-strong hover:data-[state=unchecked]:bg-faint',
        'disabled:cursor-not-allowed disabled:opacity-50',
        MOTION,
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-surface shadow-sm',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
          MOTION,
        )}
      />
    </SwitchPrimitive.Root>
  )
}
