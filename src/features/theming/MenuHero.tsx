import { Fragment, type ReactNode } from 'react'
import type { BannerHeight, ImageUrls, LogoSize, Theme } from './api.ts'

const BANNER_HEIGHTS: Record<BannerHeight, string> = { sm: 'h-32', md: 'h-48', lg: 'h-64' }
const LOGO_SIZES: Record<LogoSize, string> = { sm: 'h-12 max-w-24', md: 'h-16 max-w-32', lg: 'h-24 max-w-48' }

interface MenuHeroProps {
  theme: Theme
  imageUrls: ImageUrls
  /** Shown when the theme leaves the name empty. */
  businessName: string
}

/**
 * The top of the table menu: banner (or the theme's gradient), logo and name, tagline and welcome message, in the
 * order the theme's header blocks set. Banners sit apart; the text blocks between them share one column.
 */
export function MenuHero({ theme, imageUrls, businessName }: MenuHeroProps) {
  const { brand, colors, layout } = theme
  // The layout can hide the banner, the tagline and the welcome message; the name always shows.
  const bannerUrl = layout.show_banner && brand.banner.image_id ? imageUrls[brand.banner.image_id] : undefined
  const logoUrl = brand.logo.image_id ? imageUrls[brand.logo.image_id] : undefined
  const centered = brand.logo.position === 'center'
  const height = BANNER_HEIGHTS[brand.banner.height]
  const showTagline = layout.show_tagline && brand.tagline !== ''
  const showWelcome = layout.show_welcome && brand.welcome_message !== ''

  const banner: ReactNode = bannerUrl ? (
    <div key="banner" className={`relative overflow-hidden rounded-2xl ${height}`}>
      <img src={bannerUrl} alt="" className="h-full w-full object-cover motion-safe:animate-banner-in" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: brand.banner.overlay_color, opacity: brand.banner.overlay_opacity / 100 }}
      />
    </div>
  ) : layout.show_banner && colors.gradient.enabled ? (
    <div
      key="banner"
      aria-hidden
      className={`rounded-2xl ${height}`}
      style={{ backgroundImage: `linear-gradient(${colors.gradient.angle}deg, ${colors.gradient.from}, ${colors.gradient.to})` }}
    />
  ) : null
  // The tagline follows the name's alignment, also on its own.
  const tagline = <p className="text-base text-muted">{brand.tagline}</p>

  const parts: ReactNode[] = []
  let column: ReactNode[] = []
  const closeColumn = () => {
    if (column.length > 0) {
      parts.push(
        <div key={`text-${parts.length}`} className={`flex flex-col gap-3 motion-safe:animate-card-rise ${centered ? 'items-center text-center' : 'items-start text-left'}`}>
          {column}
        </div>,
      )
    }
    column = []
  }
  const blocks = layout.header_blocks
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block === 'banner') {
      closeColumn()
      if (banner) parts.push(banner)
    } else if (block === 'name') {
      // A tagline right below the name stays close to it.
      const withTagline = blocks[index + 1] === 'tagline'
      if (withTagline) index += 1
      column.push(
        <Fragment key="name">
          {logoUrl && (
            <img src={logoUrl} alt={`Logo de ${brand.name || businessName}`} className={`w-auto object-contain ${LOGO_SIZES[brand.logo.size]}`} />
          )}
          <div className="w-full space-y-1 [text-align:var(--type-business-name-align,center)]">
            <h1 className="type-business-name text-ink">{brand.name || businessName}</h1>
            {withTagline && showTagline && tagline}
          </div>
        </Fragment>,
      )
    } else if (block === 'tagline') {
      if (showTagline) {
        column.push(
          <div key="tagline" className="w-full [text-align:var(--type-business-name-align,center)]">
            {tagline}
          </div>,
        )
      }
    } else if (showWelcome) {
      column.push(
        <p key="welcome" className="max-w-2xl text-sm whitespace-pre-line text-ink-soft">
          {brand.welcome_message}
        </p>,
      )
    }
  }
  closeColumn()

  // Above the category bar, whose top padding rests behind the end of this header.
  return <header className="relative z-30 space-y-4">{parts}</header>
}
