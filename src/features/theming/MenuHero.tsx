import type { BannerHeight, ImageUrls, LogoSize, Theme } from './api.ts'

const BANNER_HEIGHTS: Record<BannerHeight, string> = { sm: 'h-32', md: 'h-48', lg: 'h-64' }
const LOGO_SIZES: Record<LogoSize, string> = { sm: 'h-12 max-w-24', md: 'h-16 max-w-32', lg: 'h-24 max-w-48' }

interface MenuHeroProps {
  theme: Theme
  imageUrls: ImageUrls
  /** Shown when the theme leaves the name empty. */
  businessName: string
}

/** The top of the table menu: banner (or the theme's gradient), logo, name, tagline and welcome message. */
export function MenuHero({ theme, imageUrls, businessName }: MenuHeroProps) {
  const { brand, colors } = theme
  const bannerUrl = brand.banner.image_id ? imageUrls[brand.banner.image_id] : undefined
  const logoUrl = brand.logo.image_id ? imageUrls[brand.logo.image_id] : undefined
  const centered = brand.logo.position === 'center'
  const height = BANNER_HEIGHTS[brand.banner.height]

  return (
    <header className="space-y-4">
      {bannerUrl ? (
        <div className={`relative overflow-hidden rounded-2xl ${height}`}>
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundColor: brand.banner.overlay_color, opacity: brand.banner.overlay_opacity / 100 }}
          />
        </div>
      ) : (
        colors.gradient.enabled && (
          <div
            aria-hidden
            className={`rounded-2xl ${height}`}
            style={{
              backgroundImage: `linear-gradient(${colors.gradient.angle}deg, ${colors.gradient.from}, ${colors.gradient.to})`,
            }}
          />
        )
      )}

      <div className={`flex flex-col gap-3 ${centered ? 'items-center text-center' : 'items-start text-left'}`}>
        {logoUrl && (
          <img src={logoUrl} alt={`${brand.name || businessName} logo`} className={`w-auto object-contain ${LOGO_SIZES[brand.logo.size]}`} />
        )}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{brand.name || businessName}</h1>
          {brand.tagline && <p className="text-base text-muted">{brand.tagline}</p>}
        </div>
        {brand.welcome_message && (
          <p className="max-w-2xl text-sm whitespace-pre-line text-ink-soft">{brand.welcome_message}</p>
        )}
      </div>
    </header>
  )
}
