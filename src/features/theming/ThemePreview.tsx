import { DeviceMobileIcon, DeviceTabletIcon, ForkKnifeIcon, ShoppingBagIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { MOTION } from '../../shared/ui/classes.ts'
import { formatMoney } from '../catalog/price.ts'
import { fetchMenu, type MenuCategory } from '../ordering/api.ts'
import { MenuBrowser } from '../ordering/MenuBrowser.tsx'
import type { ImageUrls, Theme } from './api.ts'
import { MenuHero } from './MenuHero.tsx'
import { ThemeScope } from './ThemeScope.tsx'

type Device = 'tablet' | 'phone'

const DEVICES: Record<Device, { width: number; height: number; label: string }> = {
  tablet: { width: 820, height: 1080, label: 'Tablet' },
  phone: { width: 390, height: 780, label: 'Phone' },
}

/** Scale that fits a frame of `width` pixels into its container (never above 1). */
function useFitScale(width: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [width])
  return { ref, scale }
}

interface ThemePreviewProps {
  theme: Theme
  imageUrls: ImageUrls
  businessName: string
}

/** The table menu drawn with the draft, at tablet or phone size; nothing here reaches the tables. */
export function ThemePreview({ theme, imageUrls, businessName }: ThemePreviewProps) {
  const [device, setDevice] = useState<Device>('phone')
  const [menu, setMenu] = useState<MenuCategory[] | null>(null)
  const [menuFailed, setMenuFailed] = useState(false)
  const frame = DEVICES[device]
  const { ref, scale } = useFitScale(frame.width)
  const logoUrl = theme.brand.logo.image_id ? imageUrls[theme.brand.logo.image_id] : undefined

  useEffect(() => {
    let active = true
    fetchMenu()
      .then((categories) => active && setMenu(categories))
      .catch(() => active && setMenuFailed(true))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Preview size" className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
        {(Object.keys(DEVICES) as Device[]).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={device === option}
            onClick={() => setDevice(option)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold active:scale-[0.98] ${MOTION} ${
              device === option ? 'bg-action text-action-ink' : 'text-ink-soft hover:bg-subtle'
            }`}
          >
            {option === 'phone' ? <DeviceMobileIcon size={16} aria-hidden /> : <DeviceTabletIcon size={16} aria-hidden />}
            {DEVICES[option].label}
          </button>
        ))}
      </div>

      <div ref={ref} className="w-full">
        <div style={{ height: frame.height * scale }} className="mx-auto" aria-label={`Menu preview, ${frame.label}`}>
          <div
            style={{ width: frame.width, height: frame.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            className="overflow-hidden rounded-3xl border-8 border-zinc-900 shadow-lg"
          >
            <ThemeScope theme={theme} imageUrls={imageUrls} contained className="flex h-full flex-col">
              <div className="flex items-center gap-3 border-b border-line bg-surface/80 px-4 py-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
                    <ForkKnifeIcon size={16} weight="bold" aria-hidden />
                  </span>
                )}
                <p className="truncate text-sm font-semibold text-ink">{theme.brand.name || businessName}</p>
              </div>

              <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-4">
                <MenuHero theme={theme} imageUrls={imageUrls} businessName={businessName} />
                {menu && <MenuBrowser categories={menu} onAdd={() => Promise.resolve(null)} />}
                {menuFailed && <p className="text-sm text-muted">The menu could not be loaded for the preview.</p>}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between rounded-2xl bg-cart px-4 py-3 text-cart-ink">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    <ShoppingBagIcon size={20} aria-hidden />
                    Table order
                    <span className="rounded-md bg-badge px-2 text-sm text-badge-ink tabular-nums">2</span>
                  </span>
                  <span className="text-base font-semibold tabular-nums">{formatMoney(4500)}</span>
                </div>
              </div>
            </ThemeScope>
          </div>
        </div>
      </div>
    </div>
  )
}
