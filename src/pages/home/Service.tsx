import { CallBellIcon, CookingPotIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import kitchenTablet from '../../assets/landing/kitchen-tablet.webp'
import menuTablet from '../../assets/landing/menu-tablet.webp'
import waiterTablet from '../../assets/landing/waiter-tablet.webp'
import { MOTION } from '../../shared/ui/classes.ts'

/** A tablet drawn around real screens of the app (4:3 captures); the screens stack so they can cross-fade. */
function Tablet({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-4xl bg-neutral-800 p-3 shadow-2xl ring-1 ring-white/10">
      <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-surface">{children}</div>
    </div>
  )
}

/** First half: the table menu on a tablet. It lies back and stands up as the section scrolls in (`data-tilt`). */
export function AppShowcase() {
  return (
    <section id="app" data-dark-section className="overflow-hidden bg-ink px-4 py-24 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-sm font-semibold text-sun">La app en la mesa</p>
          <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">Esto es lo que ven tus clientes</h2>
          <p className="mx-auto max-w-[680px] text-lg text-pretty text-white/70">
            Tu menú con tus categorías y precios, y a un lado el pedido de la mesa: todos agregan y el total se actualiza
            en vivo.
          </p>
        </div>
        <div className="relative mx-auto mt-16 max-w-4xl">
          {/* A huge faint word behind the tablet; it slides sideways with the scroll. */}
          <p
            aria-hidden
            data-parallax-x="-160"
            className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 text-9xl font-semibold tracking-tight whitespace-nowrap text-white/5 select-none"
          >
            Tu menú, en la mesa
          </p>
          <div data-tilt className="relative">
            <div className="motion-safe:animate-float-slow">
              <Tablet>
                <img
                  src={menuTablet}
                  alt="El menú de una taquería en una tablet, con el pedido compartido de la mesa a la derecha"
                  loading="lazy"
                  className="size-full object-cover object-top"
                />
              </Tablet>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const STEPS: { label: string; title: string; body: string; image: string; alt: string; icon: ReactNode }[] = [
  {
    label: 'La mesa pide',
    title: 'Todos agregan, la mesa envía una sola orden',
    body: 'Cada persona escanea el código QR de la mesa o usa la tablet. Lo que agrega aparece al instante en el pedido de todos, con el total, y cualquiera lo envía.',
    image: menuTablet,
    alt: 'El menú de la mesa con el pedido compartido listo para enviar',
    icon: <QrCodeIcon size={20} weight="fill" aria-hidden />,
  },
  {
    label: 'La cocina prepara',
    title: 'La comanda llega sola a la cocina',
    body: 'La orden entra a la pantalla de cocina en cuanto la mesa la envía. Cocina marca cada platillo en preparación y listo, sin esperar al resto de la orden.',
    image: kitchenTablet,
    alt: 'La pantalla de cocina con una orden: dos platillos en preparación y dos listos',
    icon: <CookingPotIcon size={20} weight="fill" aria-hidden />,
  },
  {
    label: 'El mesero entrega',
    title: 'El mesero lleva lo que ya salió',
    body: 'Cada platillo listo aparece en la pantalla del mesero dentro de su orden, con la mesa y lo que falta. Al final ve la cuenta de la mesa y la cobra.',
    image: waiterTablet,
    alt: 'La pantalla del mesero con los platillos listos para llevar a la mesa',
    icon: <CallBellIcon size={20} weight="fill" aria-hidden />,
  },
]

/** Second half: the visitor picks a step and the tablet shows that screen of the app, with what happens below. */
export function ServiceSteps() {
  const [selected, setSelected] = useState(0)
  const step = STEPS[selected]

  return (
    <section id="flow" className="px-4 py-24 sm:px-6">
      <div data-leave className="mx-auto max-w-5xl">
        <div data-reveal className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-sm font-semibold text-brand">El servicio, paso a paso</p>
          <h2 className="text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl">Toca un paso y mira qué pasa</h2>
        </div>

        <div data-reveal role="tablist" aria-label="Pasos del servicio" className="mt-12 flex flex-wrap justify-center gap-2">
          {STEPS.map((option, index) => (
            <button
              key={option.label}
              type="button"
              role="tab"
              id={`flow-tab-${index}`}
              aria-selected={index === selected}
              aria-controls="flow-panel"
              onClick={() => setSelected(index)}
              className={`flex items-center gap-2 rounded-full border px-4 py-3 text-base font-semibold active:scale-[0.98] ${MOTION} ${
                index === selected
                  ? 'border-ink bg-ink text-white shadow-lg'
                  : 'border-line-strong bg-surface text-ink-soft hover:-translate-y-0.5 hover:border-ink hover:text-ink'
              }`}
            >
              <span className={index === selected ? 'text-sun' : 'text-brand'}>{option.icon}</span>
              <span className="text-faint">0{index + 1}</span>
              {option.label}
            </button>
          ))}
        </div>

        <div data-reveal id="flow-panel" role="tabpanel" aria-labelledby={`flow-tab-${selected}`} className="mx-auto mt-12 max-w-3xl">
          <Tablet>
            {STEPS.map((option, index) => (
              <img
                key={option.label}
                src={option.image}
                alt={index === selected ? option.alt : ''}
                aria-hidden={index !== selected}
                loading="lazy"
                className={`absolute inset-0 size-full object-cover object-top duration-700 ${MOTION} ${
                  index === selected ? 'opacity-100' : 'translate-y-6 scale-95 opacity-0'
                }`}
              />
            ))}
          </Tablet>
          {/* Keyed by step so the text rises in again each time the step changes. */}
          <div key={selected} className="mx-auto mt-8 max-w-[680px] text-center motion-safe:animate-card-rise">
            <h3 className="text-2xl font-semibold text-balance text-ink">{step.title}</h3>
            <p className="mt-2 text-lg text-pretty text-muted">{step.body}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
