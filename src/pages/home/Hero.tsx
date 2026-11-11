import {
  ArrowRightIcon,
  BowlFoodIcon,
  CheckCircleIcon,
  CookingPotIcon,
  HamburgerIcon,
  PizzaIcon,
  PlusIcon,
  QrCodeIcon,
} from '@phosphor-icons/react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { usePointerTilt } from '../../shared/motion/motion.ts'
import { MOTION } from '../../shared/ui/classes.ts'

const DISHES: { name: string; note: string; price: string; tile: string; icon: ReactNode }[] = [
  { name: 'Hamburguesa de la casa', note: 'Con papas', price: '$149.00', tile: 'bg-accent/15 text-accent', icon: <HamburgerIcon size={24} weight="fill" aria-hidden /> },
  { name: 'Pizza margarita', note: 'Mediana', price: '$189.00', tile: 'bg-brand/10 text-brand', icon: <PizzaIcon size={24} weight="fill" aria-hidden /> },
  { name: 'Bowl de pollo', note: 'Sin cebolla', price: '$129.00', tile: 'bg-leaf/15 text-leaf', icon: <BowlFoodIcon size={24} weight="fill" aria-hidden /> },
]

/** A drawn table menu (no screenshots): what a guest sees on the phone, with the kitchen answering around it. */
function MenuMock() {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-4 shadow-2xl shadow-brand/20">
      <div className="flex items-center justify-between rounded-2xl bg-linear-to-br from-brand to-accent p-4 text-white">
        <div>
          <p className="text-xs font-medium text-white/80">Mesa 5 · 3 personas</p>
          <p className="text-lg font-semibold">La orden de la mesa</p>
        </div>
        <QrCodeIcon size={32} aria-hidden />
      </div>
      <ul className="mt-3 space-y-2">
        {DISHES.map((dish) => (
          <li key={dish.name} className="flex items-center gap-3 rounded-2xl border border-line p-2">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${dish.tile}`}>{dish.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{dish.name}</span>
              <span className="block text-xs text-muted">{dish.note}</span>
            </span>
            <span className="text-sm font-semibold text-ink">{dish.price}</span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
              <PlusIcon size={16} weight="bold" aria-hidden />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink p-3 text-white">
        <span className="text-sm">
          3 platillos · <span className="font-semibold">$467.00</span>
        </span>
        <span className="rounded-lg bg-sun px-3 py-1 text-sm font-semibold text-ink">Enviar orden</span>
      </div>
    </div>
  )
}

export function Hero() {
  const stage = useRef<HTMLDivElement>(null)
  const mock = useRef<HTMLDivElement>(null)
  usePointerTilt(stage, mock)

  return (
    <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 lg:pt-40">
      {/* Soft color fields behind the hero; they drift with the scroll. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div data-parallax="120" className="absolute -top-24 -right-24 size-[32rem] rounded-full bg-accent/25 blur-3xl" />
        <div data-parallax="-80" className="absolute top-64 -left-32 size-96 rounded-full bg-brand/15 blur-3xl" />
        <div data-parallax="60" className="absolute right-1/3 bottom-0 size-72 rounded-full bg-sun/30 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <p data-enter className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-brand shadow-xs">
            <span aria-hidden className="size-2 rounded-full bg-brand motion-safe:animate-pulse" />
            Menú digital para restaurantes
          </p>
          <h1 data-enter className="max-w-[680px] text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
            Tu menú en cada mesa,
            <br />
            <span className="bg-linear-to-r from-brand to-accent bg-clip-text text-transparent">tus órdenes directo a la cocina</span>
          </h1>
          <p data-enter className="max-w-[680px] text-lg text-muted">
            Tus clientes escanean el código QR, arman juntos una sola orden y la envían. La cocina la recibe al instante y
            el mesero sabe qué llevar a cada mesa.
          </p>
          <div data-enter className="flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className={`group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-base font-semibold text-brand-ink shadow-lg shadow-brand/30 hover:-translate-y-0.5 hover:bg-action-hover active:scale-[0.98] ${MOTION}`}
            >
              Crear mi negocio
              <ArrowRightIcon size={16} weight="bold" aria-hidden className={`group-hover:translate-x-1 ${MOTION}`} />
            </Link>
            <Link to="/login" className={`rounded-xl px-3 py-3 text-base font-semibold text-ink-soft hover:text-brand ${MOTION}`}>
              Ya tengo cuenta
            </Link>
          </div>
          <ul data-enter className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            {['Sin instalar aplicaciones', 'Con código QR o tablet', 'Hasta 30 personas por mesa'].map((fact) => (
              <li key={fact} className="flex items-center gap-2">
                <CheckCircleIcon size={16} weight="fill" aria-hidden className="text-leaf" />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div ref={stage} data-enter className="relative flex min-w-0 justify-center py-8">
          <div ref={mock} className="relative w-full max-w-sm">
            <MenuMock />
            <p className="absolute -top-6 left-0 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-xl motion-safe:animate-float sm:-left-12">
              <span className="flex size-8 items-center justify-center rounded-lg bg-sun/30 text-warning">
                <CookingPotIcon size={16} weight="fill" aria-hidden />
              </span>
              Cocina recibió la orden 24
            </p>
            <p className="absolute right-0 -bottom-6 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-xl motion-safe:animate-float-slow sm:-right-10">
              <span className="flex size-8 items-center justify-center rounded-lg bg-leaf/15 text-leaf">
                <CheckCircleIcon size={16} weight="fill" aria-hidden />
              </span>
              Pizza margarita lista
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
