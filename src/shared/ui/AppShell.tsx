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
  /** False: the bar scrolls away with the page instead of staying on top (a table menu's layout choice). */
  fixedBar?: boolean
  /** Max width class of the content (a table menu with a four-column grid widens it). */
  width?: string
  children: ReactNode
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-action text-action-ink' : 'text-ink-soft hover:bg-subtle hover:text-ink'
  return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold active:scale-[0.98] ${MOTION} ${state}`
}

// Full class names per breakpoint, so Tailwind finds them in the source.
const BAR_BREAKPOINTS = {
  narrow: { list: 'sm:flex', signOut: 'sm:block', compact: 'sm:hidden' },
  wide: { list: 'lg:flex', signOut: 'lg:block', compact: 'lg:hidden' },
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

/** Layout of every signed-in screen: a floating bar with the business, navigation and sign out. */
export function AppShell({
  business,
  logoUrl,
  identity,
  nav = [],
  onSignOut,
  signingOut = false,
  signOutLabel = 'Sign out',
  fixedBar = true,
  width = 'max-w-5xl',
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasMenu = nav.length > 0 || onSignOut !== undefined
  // A long navigation (the admin's) only fits in the bar on wide screens; shorter ones from tablets up.
  const bar = nav.length > 4 ? BAR_BREAKPOINTS.wide : BAR_BREAKPOINTS.narrow

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
        Skip to content
      </a>

      <header className={`${fixedBar ? 'fixed' : 'absolute'} inset-x-0 top-4 z-40 flex justify-center px-4`}>
        <nav
          aria-label="Main"
          className="flex max-w-full items-center gap-2 rounded-2xl border border-line bg-surface/80 p-2 shadow-sm backdrop-blur-md"
        >
          <div className="flex min-w-0 items-center gap-3 pr-2">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink">
                <ForkKnifeIcon size={16} weight="bold" aria-hidden />
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-ink">{business}</p>
              <p className="truncate text-xs text-muted">{identity}</p>
            </div>
          </div>

          {nav.length > 0 && (
            <ul className={`hidden items-center gap-1 ${bar.list}`}>
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
            <div className={`hidden ${bar.signOut}`}>
              <button type="button" onClick={onSignOut} disabled={signingOut} className={buttonClass('ghost')}>
                <SignOutIcon size={16} aria-hidden />
                {signingOut ? 'Signing out…' : signOutLabel}
              </button>
            </div>
          )}

          {hasMenu && (
            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className={`rounded-lg p-2 text-ink-soft hover:bg-subtle active:scale-[0.98] ${bar.compact} ${MOTION}`}
            >
              <MenuToggleIcon open={menuOpen} />
            </button>
          )}
        </nav>
      </header>

      {hasMenu && (
        <div
          id="mobile-menu"
          inert={!menuOpen}
          className={`fixed inset-0 z-30 bg-canvas/95 px-6 pt-24 backdrop-blur-xl transition-opacity duration-500 ease-smooth ${bar.compact} ${
            menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <ul className="space-y-2">
            {nav.map((item, index) => (
              <li
                key={item.to}
                style={{ transitionDelay: menuOpen ? `${Math.min(index * 60, 400)}ms` : '0ms' }}
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
                style={{ transitionDelay: menuOpen ? `${Math.min(nav.length * 60, 400)}ms` : '0ms' }}
                className={`transition duration-500 ease-smooth ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
              >
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={signingOut}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-lg font-semibold text-ink-soft hover:bg-subtle ${MOTION}`}
                >
                  <SignOutIcon size={20} aria-hidden />
                  {signingOut ? 'Signing out…' : signOutLabel}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      <main id="main" className={`mx-auto ${width} px-4 pt-24 pb-16 sm:px-6`}>
        {children}
      </main>
    </div>
  )
}
