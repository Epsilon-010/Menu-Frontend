import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { createContext, useContext, type ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'
import { toggleGroupItemVariants, toggleGroupVariants } from './variants.ts'

type Width = 'fit' | 'full'

const WidthContext = createContext<Width>('fit')

/** A segmented control (single or multiple choice) over a few short options. */
export function ToggleGroup({
  className,
  width = 'fit',
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root> & { width?: Width }) {
  return (
    <WidthContext.Provider value={width}>
      <ToggleGroupPrimitive.Root data-slot="toggle-group" className={cn(toggleGroupVariants({ width }), className)} {...props} />
    </WidthContext.Provider>
  )
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const width = useContext(WidthContext)
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleGroupItemVariants({ width }), className)}
      {...props}
    />
  )
}
