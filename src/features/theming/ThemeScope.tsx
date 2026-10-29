import type { CSSProperties, ReactNode } from 'react'
import type { ImageUrls, Theme } from './api.ts'
import { backgroundPatternStyle, themeVariables } from './style.ts'

interface ThemeScopeProps {
  theme: Theme
  imageUrls: ImageUrls
  /** The real menu pins its background to the screen; the editor preview keeps it inside its frame. */
  contained?: boolean
  className?: string
  children: ReactNode
}

function BackgroundLayer({ theme, imageUrls, contained }: Omit<ThemeScopeProps, 'children' | 'className'>) {
  const { background } = theme.brand
  const position = contained ? 'absolute' : 'fixed'
  const opacity = background.opacity / 100
  if (background.kind === 'image' && background.image_id) {
    const url = imageUrls[background.image_id]
    if (!url) return null
    return (
      <div aria-hidden className={`pointer-events-none ${position} inset-0 -z-10 overflow-hidden`}>
        <img
          src={url}
          alt=""
          className="h-full w-full scale-110 object-cover"
          style={{ opacity, filter: background.blur > 0 ? `blur(${background.blur}px)` : undefined }}
        />
      </div>
    )
  }
  if (background.kind === 'pattern') {
    return (
      <div
        aria-hidden
        className={`pointer-events-none ${position} inset-0 -z-10`}
        style={{ ...backgroundPatternStyle(background.pattern, theme.colors.text), opacity }}
      />
    )
  }
  return null
}

/**
 * Draws its children with a business's theme: sets the theme's CSS variables on its root (every menu
 * component colors itself with those tokens) and paints the background image or pattern behind them.
 * It is also a size container, so the menu lays out by its own width (a phone frame in the preview).
 */
export function ThemeScope({ theme, imageUrls, contained = false, className = '', children }: ThemeScopeProps) {
  return (
    <div
      style={themeVariables(theme.colors) as CSSProperties}
      className={`@container relative isolate bg-canvas text-ink ${className}`}
    >
      <BackgroundLayer theme={theme} imageUrls={imageUrls} contained={contained} />
      {children}
    </div>
  )
}
