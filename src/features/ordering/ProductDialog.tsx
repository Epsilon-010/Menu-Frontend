import { XIcon } from '@phosphor-icons/react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { FOCUS_RING, MOTION } from '../../components/ui/styles.ts'
import { formatMoney } from '../catalog/price.ts'
import { BADGE_LABELS } from '../catalog/badges.ts'
import { useThemeVars } from '../theming/themeVars.ts'
import { AddLineForm } from './AddLineForm.tsx'
import type { MenuItem } from './api.ts'

interface ProductDialogProps {
  item: MenuItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (quantity: number, note: string, optionIds: string[]) => Promise<string | null>
}

/**
 * The product over the menu, to choose its options, how many and a note: the menu behind blurs and dims. On a phone it
 * is a sheet that rises from the bottom; from `sm` up, a window in the middle. It is drawn in a portal on `body`, so
 * it sets the business's theme variables again.
 */
export function ProductDialog({ item, open, onOpenChange, onAdd }: ProductDialogProps) {
  const themeVars = useThemeVars()
  const image = item.image?.card_url ?? null
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <div className="contents" style={{ ...themeVars, fontFamily: 'var(--type-body-family, inherit)' }}>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md motion-safe:data-[state=open]:animate-overlay-in" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={
              'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-surface text-ink shadow-2xl ' +
              'motion-safe:data-[state=open]:animate-sheet-in ' +
              'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)] sm:max-w-lg ' +
              'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:motion-safe:data-[state=open]:animate-product-in'
            }
          >
            <div className="overflow-y-auto overscroll-contain">
              {image && <img src={image} alt="" className="aspect-[16/10] w-full bg-subtle object-cover" />}
              <div className="space-y-4 p-4 sm:p-6">
                <div className="space-y-2">
                  {item.badges.length > 0 && (
                    <ul aria-label="Etiquetas" className="flex flex-wrap gap-1">
                      {item.badges.map((badge) => (
                        <li key={badge} className="rounded-full bg-badge px-2 py-0.5 text-xs font-semibold text-badge-ink">
                          {BADGE_LABELS[badge]}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className={`flex items-start justify-between gap-4 ${image ? '' : 'pr-10'}`}>
                    <DialogPrimitive.Title className="type-statement flex-1 text-balance text-ink">{item.name}</DialogPrimitive.Title>
                    <p className="type-price shrink-0 pt-1 text-price tabular-nums">{formatMoney(item.price_cents)}</p>
                  </div>
                  {item.description && <p className="type-lead text-pretty text-muted">{item.description}</p>}
                </div>
                {/* Mounted only while open, so the next open starts again from one dish and no options. */}
                <AddLineForm item={item} onAdd={onAdd} onDone={() => onOpenChange(false)} />
              </div>
            </div>
            <DialogPrimitive.Close
              className={`absolute top-3 right-3 rounded-full bg-surface/90 p-2 text-ink shadow-md hover:bg-surface active:scale-[0.96] ${MOTION} ${FOCUS_RING}`}
            >
              <XIcon size={18} weight="bold" aria-hidden />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
