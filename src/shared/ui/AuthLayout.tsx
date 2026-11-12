import { ChefHatIcon, CookingPotIcon, ForkKnifeIcon, KnifeIcon } from '@phosphor-icons/react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { usePageMotion } from '../motion/motion.ts'

/**
 * Sign in and sign-up layout, as tall and wide as the screen and split in two: a flat brand panel with kitchen
 * utensils drawn large and faint (wide screens only), and the form, with underlined fields.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const page = useRef<HTMLElement>(null)
  usePageMotion(page)

  return (
    <main ref={page} className="grid min-h-svh bg-surface lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-brand-ink lg:flex">
        {/* Kitchen utensils, oversized and barely there, so the panel reads as a place and not as a banner. */}
        <ChefHatIcon aria-hidden weight="fill" className="pointer-events-none absolute -top-16 -right-16 size-96 text-white/10" />
        <CookingPotIcon aria-hidden weight="fill" className="pointer-events-none absolute -bottom-24 -left-16 size-[28rem] text-white/10" />
        <KnifeIcon aria-hidden weight="fill" className="pointer-events-none absolute right-12 bottom-24 size-40 -rotate-12 text-white/10" />

        <Link to="/" className="relative flex items-center gap-3 text-lg font-semibold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand">
            <ForkKnifeIcon size={20} weight="bold" aria-hidden />
          </span>
          Menú
        </Link>

        <div data-enter className="relative space-y-4">
          <p className="max-w-md text-5xl font-semibold tracking-tight text-balance xl:text-6xl">La cocina ya sabe qué preparar.</p>
          <p className="max-w-sm text-lg text-pretty text-white/90">Cada mesa pide por su cuenta y la cocina se entera al instante.</p>
        </div>

        <p className="relative text-sm text-white/70">Menú digital para restaurantes</p>
      </section>

      <section data-enter className="auth-form flex items-center justify-center px-4 py-12 sm:px-12">
        {children}
      </section>
    </main>
  )
}

/** The small logo above the form title, only where the illustrated half is hidden. */
export function AuthLogo() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-ink lg:hidden">
      <ForkKnifeIcon size={20} weight="bold" aria-hidden />
    </span>
  )
}
