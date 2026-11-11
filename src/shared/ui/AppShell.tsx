import { ForkKnifeIcon, SignOutIcon } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { buttonClass, MOTION } from './classes.ts'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Match the path exactly (for an index route like /admin). */
  end?: boolean
}

interface AppShellProps {
  business: string
  /** The business's logo (table menu); without it, a generic mark. */
  logoUrl?: string
  /** Who or what is signed in on this device. */
  identity: string
  nav?: NavItem[]
  onSignOut?: () => void
  signingOut?: boolean
  /** Text of the sign out button ("Leave" for a guest at a table). */
  signOutLabel?: string
  /** False: the bar scrolls away with the page instead of sticking to the top (a table menu's layout choice). */
  fixedBar?: boolean
  /** Max width class of the content (a table menu with a four-column grid widens it). */
  width?: string
  children: ReactNode
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-action text-action-ink' : 'text-ink-soft hover:bg-subtle hover:text-ink'
  return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold active:scale-[0.98] ${MOTION} ${state}`
}

/** Links of the colored side rail: white on the brand color, the current section raised on a white pill. */
function railLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-white text-brand shadow-md' : 'text-white/85 hover:translate-x-1 hover:bg-white/15 hover:text-white'
  return `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold active:scale-[0.98] ${MOTION} ${state}`
}

// Full class names per breakpoint, so Tailwind finds them in the source.
const BAR_BREAKPOINTS = {
  // Nothing to navigate to (a table menu): the only action stays in the bar at every width.
  inline: { list: 'hidden', signOut: 'block', compact: 'hidden' },
  narrow: {
    list: 'hidden sm:flex',
    signOut: 'hidden sm:block',
    compact: 'sm:hidden',
  },
  wide: {
    list: 'hidden lg:flex',
    signOut: 'hidden lg:block',
    compact: 'lg:hidden',
  },
  // The side rail takes over on wide screens: the top bar never holds the links.
  rail: { list: 'hidden', signOut: 'hidden', compact: 'xl:hidden' },
}

/** The two lines of the menu toggle rotate into an X instead of swapping icons. */
function MenuToggleIcon({ open }: { open: boolean }) {
  const line = `absolute left-0 h-0.5 w-4 rounded-full bg-current transition-transform duration-500 ease-smooth`
  return (
    <span aria-hidden className="relative block h-4 w-4">
      <span className={`${line} top-1 ${open ? 'translate-y-1 rotate-45' : ''}`} />
      <span className={`${line} top-3 ${open ? '-translate-y-1 -rotate-45' : ''}`} />
    </span>
  )
}

/** Layout of every signed-in screen: a top bar with the business, navigation and sign out, then the content. */
export function AppShell({
  business,
  logoUrl,
  identity,
  nav = [],
  onSignOut,
  signingOut = false,
  signOutLabel = 'Cerrar sesión',
  fixedBar = true,
  width = 'max-w-5xl',
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  // The full height menu holds the links; with none, sign out stays in the bar and there is nothing to open.
  const hasMenu = nav.length > 0
  // A long navigation (the admin's eleven sections) gets a side rail on wide screens instead of hiding behind the toggle.
  const hasRail = nav.length > 8
  const bar =
    nav.length === 0
      ? BAR_BREAKPOINTS.inline
      : hasRail
        ? BAR_BREAKPOINTS.rail
        : nav.length > 4
          ? BAR_BREAKPOINTS.wide
          : BAR_BREAKPOINTS.narrow
  const brandMark = logoUrl ? (
    <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink">
      <ForkKnifeIcon size={16} weight="bold" aria-hidden />
    </span>
  )
  const brandText = (
    <div className="min-w-0 leading-tight">
      <p className="truncate text-sm font-semibold text-ink">{business}</p>
      <p className="truncate text-xs text-muted">{identity}</p>
    </div>
  )

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only rounded-lg bg-action px-3 py-2 text-sm font-semibold text-action-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
      >
        Saltar al contenido
      </a>

      {hasRail && (
        <aside className="fixed inset-y-4 left-4 z-40 hidden w-60 flex-col gap-2 overflow-hidden rounded-3xl bg-linear-to-b from-brand to-action-hover p-3 text-white shadow-xl shadow-brand/25 xl:flex">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full border-[24px] border-white/10" />
          <div className="relative flex min-w-0 items-center gap-3 p-2">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
                <ForkKnifeIcon size={20} weight="bold" aria-hidden />
              </span>
            )}
            <p className="truncate text-base font-semibold">{business}</p>
          </div>
          <nav aria-label="Secciones" className="relative min-h-0 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={railLinkClass}>
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="relative space-y-3 rounded-2xl bg-linear-to-br from-accent to-sun p-3 text-ink shadow-lg">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand">
                {identity.trim().charAt(0).toUpperCase()}
              </span>
              <p className="truncate text-sm font-semibold">{identity}</p>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                disabled={signingOut}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-white/80 active:scale-[0.98] disabled:opacity-50 ${MOTION}`}
              >
                <SignOutIcon size={16} aria-hidden />
                {signingOut ? 'Cerrando sesión…' : signOutLabel}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* In the page flow: the bar takes its own row, so it never sits on top of the content below it. */}
      <header
        className={`${fixedBar ? 'sticky top-0' : 'relative'} z-40 border-b border-line bg-surface/90 backdrop-blur-md ${hasRail ? 'xl:hidden' : ''}`}
      >
        <nav aria-label="Principal" className={`mx-auto flex h-16 ${width} items-center gap-4 px-4 sm:px-6`}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {brandMark}
            {brandText}
          </div>
          {nav.length > 0 && (
            <ul className={`shrink-0 items-center gap-1 ${bar.list}`}>
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={navLinkClass}>
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
          {onSignOut && (
            // The wrapper owns the visibility: the button's own classes already set its display.
            <div className={`shrink-0 ${bar.signOut}`}>
              <button type="button" onClick={onSignOut} disabled={signingOut} className={buttonClass('secondary')}>
                <SignOutIcon size={16} aria-hidden />
                {signingOut ? 'Cerrando sesión…' : signOutLabel}
              </button>
            </div>
          )}
          {hasMenu && (
            <div className={`shrink-0 ${bar.compact}`}>
              <button
                type="button"
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                onClick={() => setMenuOpen((open) => !open)}
                className={`flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-subtle active:scale-[0.98] ${MOTION}`}
              >
                <MenuToggleIcon open={menuOpen} />
              </button>
            </div>
          )}
        </nav>
      </header>

      {hasMenu && (
        <div
          id="mobile-menu"
          inert={!menuOpen}
          className={`fixed inset-0 z-30 overflow-y-auto bg-canvas/95 px-6 pt-20 pb-8 backdrop-blur-xl transition-opacity duration-500 ease-smooth ${bar.compact} ${
            menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <ul className="space-y-2">
            {nav.map((item, index) => (
              <li
                key={item.to}
                style={{
                  transitionDelay: menuOpen ? `${Math.min(index * 60, 400)}ms` : '0ms',
                }}
                className={`transition duration-500 ease-smooth ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
              >
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-lg font-semibold ${MOTION} ${
                      isActive ? 'bg-action text-action-ink' : 'text-ink-soft hover:bg-subtle'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
            {onSignOut && (
              <li
                style={{
                  transitionDelay: menuOpen ? `${Math.min(nav.length * 60, 400)}ms` : '0ms',
                }}
                className={`transition duration-500 ease-smooth ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
              >
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={signingOut}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-lg font-semibold text-ink-soft hover:bg-subtle ${MOTION}`}
                >
                  <SignOutIcon size={20} aria-hidden />
                  {signingOut ? 'Cerrando sesión…' : signOutLabel}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className={hasRail ? 'xl:pl-64' : undefined}>
        <main id="main" className={`mx-auto ${width} px-4 pt-8 pb-16 sm:px-6`}>
          {children}
        </main>
      </div>
    </div>
  )
}
