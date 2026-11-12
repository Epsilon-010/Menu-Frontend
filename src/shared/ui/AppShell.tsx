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
  /**
   * A slim rail of icons on wide screens instead of the top bar (the waiter and kitchen screens): each item is an
   * icon over its label. The top bar and its menu still serve narrow screens.
   */
  iconRail?: NavItem[]
  /** The person signed in, for the icon rail (which has no room for the whole `identity`). */
  person?: string
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

/** Links of the side rail: plain on the white rail, the current section on a pill of the brand color. */
function railLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-brand text-brand-ink' : 'text-ink-soft hover:bg-subtle hover:text-ink'
  return `flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold active:scale-[0.98] ${MOTION} ${state}`
}

/** Items of the slim icon rail: the current screen on a tile of the brand color. */
function iconRailLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-brand text-brand-ink' : 'text-muted hover:bg-subtle hover:text-ink'
  return `flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-3 text-xs font-semibold active:scale-[0.98] ${MOTION} ${state}`
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
  iconRail,
  person,
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
  // A long navigation (the admin's eleven sections) gets a white side rail on wide screens instead of hiding behind the toggle.
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
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-6 bg-surface p-4 xl:flex">
          <div className="flex min-w-0 items-center gap-3 px-2 pt-2">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink">
                <ForkKnifeIcon size={20} weight="bold" aria-hidden />
              </span>
            )}
            <p className="truncate text-base font-semibold text-ink">{business}</p>
          </div>
          <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto">
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
          <div className="space-y-2">
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-line p-1 pr-4">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                {identity.trim().charAt(0).toUpperCase()}
              </span>
              <p className="truncate text-sm font-semibold text-ink">{identity}</p>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                disabled={signingOut}
                className={`flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-subtle hover:text-ink active:scale-[0.98] disabled:opacity-50 ${MOTION}`}
              >
                <SignOutIcon size={16} aria-hidden />
                {signingOut ? 'Cerrando sesión…' : signOutLabel}
              </button>
            )}
          </div>
        </aside>
      )}

      {iconRail && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col items-center gap-4 bg-surface p-3 lg:flex">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-12 shrink-0 rounded-2xl object-contain" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink">
              <ForkKnifeIcon size={24} weight="bold" aria-hidden />
            </span>
          )}
          <nav aria-label="Pantallas" className="min-h-0 w-full flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {iconRail.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={iconRailLinkClass}>
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex w-full flex-col items-center gap-2">
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {(person ?? identity).trim().charAt(0).toUpperCase()}
            </span>
            <p className="w-full truncate text-center text-xs text-muted">{person ?? identity}</p>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                disabled={signingOut}
                className={`flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-xs font-semibold text-muted hover:bg-subtle hover:text-ink active:scale-[0.98] disabled:opacity-50 ${MOTION}`}
              >
                <SignOutIcon size={20} aria-hidden />
                {signingOut ? 'Saliendo…' : 'Salir'}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* In the page flow: the bar takes its own row, so it never sits on top of the content below it. */}
      <header
        className={`${fixedBar ? 'sticky top-0' : 'relative'} z-40 border-b border-line bg-surface/90 backdrop-blur-md ${hasRail ? 'xl:hidden' : ''} ${iconRail ? 'lg:hidden' : ''}`}
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

      <div className={hasRail ? 'xl:pl-60' : iconRail ? 'lg:pl-24' : undefined}>
        <main id="main" className={`mx-auto ${width} px-4 pt-8 pb-16 sm:px-6`}>
          {children}
        </main>
      </div>
    </div>
  )
}
