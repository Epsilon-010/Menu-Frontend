import { CallBellIcon, CheckCircleIcon, CookingPotIcon, ForkKnifeIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { usePageMotion } from '../motion/motion.ts'

const MOMENTS: { label: string; icon: ReactNode; place: string; loop: string }[] = [
  { label: 'Mesa 5 envió su orden', icon: <QrCodeIcon size={16} weight="fill" aria-hidden />, place: 'self-start', loop: 'motion-safe:animate-float' },
  { label: 'Cocina prepara 3 platillos', icon: <CookingPotIcon size={16} weight="fill" aria-hidden />, place: 'self-center', loop: 'motion-safe:animate-float-slow' },
  { label: 'Listo para llevar a la mesa', icon: <CallBellIcon size={16} weight="fill" aria-hidden />, place: 'self-end', loop: 'motion-safe:animate-float' },
]

/** Sign in and sign-up layout: the product pitch in full color on wide screens, the form on a card beside it. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const page = useRef<HTMLElement>(null)
  usePageMotion(page)

  return (
    <main ref={page} className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-brand to-accent p-12 text-white lg:flex">
        {/* Rings in the corners, like plates seen from above. */}
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full border-[56px] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-[32rem] rounded-full border-[64px] border-white/10" />

        <Link to="/" data-enter className="relative flex items-center gap-3 text-lg font-semibold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand">
            <ForkKnifeIcon size={20} weight="bold" aria-hidden />
          </span>
          Menú
        </Link>

        <ul className="relative mx-auto flex w-full max-w-md flex-col gap-4">
          {MOMENTS.map((moment) => (
            <li key={moment.label} data-enter className={moment.place}>
              <p className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink shadow-xl ${moment.loop}`}>
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">{moment.icon}</span>
                {moment.label}
                <CheckCircleIcon size={16} weight="fill" aria-hidden className="text-leaf" />
              </p>
            </li>
          ))}
        </ul>

        <div className="relative max-w-[680px] space-y-4">
          <h1 data-enter className="text-5xl font-semibold tracking-tight">
            Cada mesa pide por su cuenta.
            <br />
            La cocina se entera al instante.
          </h1>
          <p data-enter className="max-w-[680px] text-lg text-white/90">
            Los comensales arman su orden desde la mesa, la cocina libera cada platillo en cuanto está listo y el mesero lo
            lleva a la mesa correcta.
          </p>
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-brand/10 blur-3xl" />
        <div data-enter className="relative flex w-full max-w-md justify-center rounded-3xl border border-line bg-surface p-6 shadow-2xl shadow-brand/10 sm:p-8">
          {children}
        </div>
      </section>
    </main>
  )
}

/** The small logo above the form title, only where the pitch panel is hidden. */
export function AuthLogo() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand to-accent text-white lg:hidden">
      <ForkKnifeIcon size={20} weight="bold" aria-hidden />
    </span>
  )
}
