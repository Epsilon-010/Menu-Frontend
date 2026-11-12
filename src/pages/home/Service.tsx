import { ArrowRightIcon, CallBellIcon, CookingPotIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import kitchenTablet from '../../assets/landing/kitchen-tablet.webp'
import menuTablet from '../../assets/landing/menu-tablet.webp'
import waiterTablet from '../../assets/landing/waiter-tablet.webp'
import { MOTION } from '../../shared/ui/classes.ts'

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

/**
 * The service as a flow the visitor walks through: the steps are buttons on one side and a tablet on the other shows
 * that screen of the app (real 4:3 captures). On a phone the steps sit in a row above the tablet and the text below it.
 */
export function ServiceFlow() {
  const [selected, setSelected] = useState(0)
  const step = STEPS[selected]
  const next = (selected + 1) % STEPS.length

  return (
    // From `lg` up the section is one full screen: the text and steps on the left, the tablet on the right, both
    // centered, so it never shows cut in half. The wrapper grows with the screen instead of stopping at 72rem.
    <section
      id="flow"
      data-dark-section
      className="overflow-hidden bg-ink px-4 py-24 text-white sm:px-6 lg:flex lg:min-h-svh lg:items-center lg:px-12 lg:short:pt-20 lg:short:pb-4"
    >
      <div className="mx-auto w-full max-w-6xl lg:max-w-[100rem]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:gap-y-8 lg:short:gap-y-4 2xl:gap-x-20">
          <div data-reveal className="space-y-4 lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:self-end">
            <p className="text-sm font-semibold text-sun">El servicio, paso a paso</p>
            <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-4xl xl:text-5xl xl:short:text-4xl 2xl:text-6xl">
              De la mesa a la cocina, sin intermediarios
            </h2>
            <p className="max-w-[680px] text-lg text-pretty text-white/70">Toca un paso para ver esa pantalla de la app.</p>
          </div>

          <div
            data-reveal
            role="tablist"
            aria-label="Pasos del servicio"
            className="grid grid-cols-3 gap-2 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:grid-cols-1 lg:gap-3 lg:short:gap-2"
          >
            {STEPS.map((option, index) => (
              <button
                key={option.label}
                type="button"
                role="tab"
                id={`flow-tab-${index}`}
                aria-selected={index === selected}
                aria-controls="flow-panel"
                onClick={() => setSelected(index)}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-sm font-semibold active:scale-[0.98] lg:flex-row lg:gap-4 lg:p-4 lg:text-left lg:text-lg lg:short:p-2.5 lg:short:text-base ${MOTION} ${
                  index === selected
                    ? 'border-white bg-white text-ink shadow-xl'
                    : 'border-white/15 text-white/70 hover:border-white/40 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${MOTION} ${
                    index === selected ? 'bg-brand text-brand-ink' : 'bg-white/10 text-sun'
                  }`}
                >
                  {option.icon}
                </span>
                <span className="min-w-0 lg:flex-1">
                  <span className={`block text-xs font-semibold ${index === selected ? 'text-brand' : 'text-white/50'}`}>Paso {index + 1}</span>
                  {option.label}
                </span>
              </button>
            ))}
          </div>

          <div id="flow-panel" role="tabpanel" aria-labelledby={`flow-tab-${selected}`} className="lg:col-span-7 lg:col-start-6 lg:row-span-3 lg:row-start-1">
            {/* Lies back and stands up as it scrolls in (`data-tilt`), then keeps a slow float. Its width also follows
                the screen height (4:3), so the whole tablet fits in one screen. */}
            <div data-tilt className="mx-auto lg:max-w-[calc((100svh-13rem)*4/3)]">
              <div className="rounded-4xl bg-neutral-800 p-2 shadow-2xl ring-1 ring-white/10 motion-safe:animate-float-slow sm:p-3">
                <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-surface">
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
                </div>
              </div>
            </div>
          </div>

          {/* Keyed by step so the text rises in again each time the step changes. */}
          <div key={selected} className="motion-safe:animate-card-rise lg:col-span-5 lg:col-start-1 lg:row-start-3 lg:min-h-44 lg:self-start lg:short:min-h-40">
            <h3 className="text-2xl font-semibold text-balance lg:short:text-xl">{step.title}</h3>
            <p className="mt-2 text-base text-pretty text-white/70">{step.body}</p>
            <button
              type="button"
              onClick={() => setSelected(next)}
              className={`group mt-4 inline-flex items-center gap-2 rounded-full py-2 text-sm font-semibold text-sun hover:text-white ${MOTION}`}
            >
              {next === 0 ? 'Volver al inicio' : `Siguiente: ${STEPS[next].label.toLowerCase()}`}
              <ArrowRightIcon size={16} weight="bold" aria-hidden className={`group-hover:translate-x-1 ${MOTION}`} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
