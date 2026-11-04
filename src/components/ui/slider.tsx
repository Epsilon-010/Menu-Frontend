import * as SliderPrimitive from '@radix-ui/react-slider'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'
import { FOCUS_RING, MOTION } from './styles.ts'

type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /** Props of the thumb (the element with role="slider"): its accessible name and value text go here. */
  thumbProps?: ComponentProps<typeof SliderPrimitive.Thumb>
}

/** A single-thumb slider. */
export function Slider({ className, thumbProps, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('relative flex w-full touch-none items-center py-2 select-none data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-line">
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-action" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        {...thumbProps}
        className={cn(
          'block size-4 cursor-grab rounded-full border border-line-strong bg-surface shadow-sm',
          'hover:scale-110 active:cursor-grabbing data-[disabled]:pointer-events-none',
          MOTION,
          FOCUS_RING,
          thumbProps?.className,
        )}
      />
    </SliderPrimitive.Root>
  )
}
