import { CallBellIcon, CheckCircleIcon, CookingPotIcon, ForkKnifeIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { usePageMotion } from '../motion/motion.ts'

const MOMENTS: { label: string; icon: ReactNode; place: string; loop: string }[] = [
  { label: 'Mesa 5 envió su orden', icon: <QrCodeIcon size={16} weight="fill" aria-hidden />, place: 'self-start', loop: 'motion-safe:animate-float' },
  { label: 'Cocina prepara 3 platillos', icon: <CookingPotIcon size={16} weight="fill" aria-hidden />, place: 'self-end', loop: 'motion-safe:animate-float-slow' },
  { label: 'Listo para llevar a la mesa', icon: <CallBellIcon size={16} weight="fill" aria-hidden />, place: 'self-center', loop: 'motion-safe:animate-float' },
]

/**
 * Sign in and sign-up layout: one card in the middle of the page, split in two. The left half is a drawn scene of
 * a service in the brand colors (wide screens only); the right half holds the form, with underlined fields.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const page = useRef<HTMLElement>(null)
  usePageMotion(page)

  return (
    <main ref={page} className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-[28rem] rounded-full bg-brand/15 blur-3xl" />

      <div
        data-enter
        className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-2xl shadow-brand/20 lg:min-h-[40rem] lg:grid-cols-2"
      >
        <section className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-brand via-brand to-accent p-10 text-white lg:flex">
          {/* Plates seen from above, and a warm glow, drawn with plain shapes. */}
          <div aria-hidden className="pointer-events-none absolute -top-28 -right-28 size-96 rounded-full border-[48px] border-white/10" />
          <div aria-hidden className="pointer-events-none absolute -bottom-36 -left-20 size-[26rem] rounded-full border-[56px] border-white/10" />
          <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/4 size-64 rounded-full bg-sun/40 blur-3xl" />

          <Link to="/" className="relative flex items-center gap-3 text-lg font-semibold">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand">
              <ForkKnifeIcon size={20} weight="bold" aria-hidden />
            </span>
            Menú
          </Link>

          <div className="relative space-y-8">
            <p className="text-4xl font-semibold tracking-[0.3em] uppercase">Bienvenido</p>
            <ul className="flex flex-col gap-4">
              {MOMENTS.map((moment) => (
                <li key={moment.label} className={moment.place}>
                  <p className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink shadow-xl ${moment.loop}`}>
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">{moment.icon}</span>
                    {moment.label}
                    <CheckCircleIcon size={16} weight="fill" aria-hidden className="text-leaf" />
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative max-w-sm text-base text-white/90">
            Cada mesa pide por su cuenta y la cocina se entera al instante.
          </p>
        </section>

        <section className="auth-form flex items-center justify-center p-6 sm:p-12">{children}</section>
      </div>
    </main>
  )
}

/** The small logo above the form title, only where the illustrated half is hidden. */
export function AuthLogo() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand to-accent text-white lg:hidden">
      <ForkKnifeIcon size={20} weight="bold" aria-hidden />
    </span>
  )
}
