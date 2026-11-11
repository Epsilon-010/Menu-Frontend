import { ArrowRightIcon, CallBellIcon, CookingPotIcon, UserIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import menuPhone from '../../assets/landing/menu-phone.webp'
import { MOTION } from '../../shared/ui/classes.ts'

/** A phone drawn around a real capture of the table menu, as a guest sees it after scanning the QR code. */
function PhoneMock() {
  return (
    <div className="w-72 rounded-[2.5rem] bg-ink p-2 shadow-2xl sm:w-80">
      <img
        src={menuPhone}
        alt="El menú de una taquería en un celular, con el pedido de la mesa abajo"
        width={390}
        height={800}
        className="w-full rounded-4xl"
      />
    </div>
  )
}

/** One of the cards around the phone. It drifts `drift` pixels while the hero scrolls by, so the cards and the phone move apart. */
function SideCard({ place, drift, children }: { place: string; drift: number; children: ReactNode }) {
  return (
    <div className={`absolute hidden lg:block ${place}`}>
      <div data-parallax={drift} className="w-60 rounded-3xl border border-line bg-surface p-4 text-left shadow-xl">
        {children}
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="overflow-hidden px-4 pt-32 pb-24 sm:px-6 lg:pt-40">
      <div className="mx-auto max-w-6xl text-center">
        <h1 data-enter className="mx-auto max-w-5xl text-5xl font-semibold tracking-tight text-balance text-ink sm:text-6xl lg:text-7xl">
          Tu menú en cada mesa.
          <br />
          <span className="text-brand">La orden, directo a cocina.</span>
        </h1>
        <p data-enter className="mx-auto mt-6 max-w-[680px] text-lg text-pretty text-muted">
          Tus clientes escanean el código QR, arman juntos una sola orden y la envían. La cocina la recibe al instante y
          el mesero sabe qué llevar a cada mesa.
        </p>
        <div data-enter className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className={`group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-base font-semibold text-white hover:-translate-y-0.5 hover:bg-brand active:scale-[0.98] ${MOTION}`}
          >
            Crear mi negocio
            <ArrowRightIcon size={16} weight="bold" aria-hidden className={`group-hover:translate-x-1 ${MOTION}`} />
          </Link>
          <Link
            to="/login"
            className={`rounded-full border border-line-strong bg-surface px-6 py-3 text-base font-semibold text-ink hover:-translate-y-0.5 hover:border-ink active:scale-[0.98] ${MOTION}`}
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p data-enter className="mt-4 text-sm text-muted">Sin instalar aplicaciones. Con código QR o con tablet.</p>

        <div data-enter className="relative mx-auto mt-16 flex max-w-5xl justify-center">
          <SideCard place="top-8 left-0 -rotate-6" drift={-160}>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="flex size-8 items-center justify-center rounded-lg bg-sun/30 text-warning">
                <CookingPotIcon size={16} weight="fill" aria-hidden />
              </span>
              Cocina · Orden 1
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li className="flex items-center justify-between gap-2">
                Pastor
                <span className="rounded-full bg-sun/30 px-2 py-0.5 text-xs font-semibold text-warning">Preparando</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                Agua de horchata
                <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-xs font-semibold text-leaf">Lista</span>
              </li>
            </ul>
          </SideCard>

          <SideCard place="top-0 right-0 rotate-6" drift={-224}>
            <div className="flex -space-x-2">
              {['bg-brand', 'bg-accent', 'bg-leaf'].map((tone) => (
                <span key={tone} className={`flex size-8 items-center justify-center rounded-full border-2 border-surface text-white ${tone}`}>
                  <UserIcon size={16} weight="fill" aria-hidden />
                </span>
              ))}
            </div>
            <p className="mt-3 text-lg font-semibold text-ink">Tres celulares, una sola orden.</p>
            <p className="mt-1 text-sm text-muted">Cada quien agrega lo suyo.</p>
          </SideCard>

          <SideCard place="right-8 bottom-8 -rotate-3" drift={-112}>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="flex size-8 items-center justify-center rounded-lg bg-leaf/15 text-leaf">
                <CallBellIcon size={16} weight="fill" aria-hidden />
              </span>
              Listo para llevar
            </p>
            <p className="mt-2 text-sm text-muted">Mesa 5 · 3 de pastor</p>
          </SideCard>

          <div data-parallax="-48" className="relative">
            <div className="motion-safe:animate-float">
              <PhoneMock />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
