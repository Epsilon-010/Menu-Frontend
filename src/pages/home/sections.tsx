import {
  ArrowRightIcon,
  CallBellIcon,
  CaretDownIcon,
  ChartBarIcon,
  CookingPotIcon,
  ForkKnifeIcon,
  PaperPlaneTiltIcon,
  QrCodeIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { MOTION } from '../../shared/ui/classes.ts'

/** True while a dark section (`data-dark-section`) sits under the strip at the top of the screen where the nav lives. */
function useOverDarkSection(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const under = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) under.add(entry.target)
          else under.delete(entry.target)
        }
        setDark(under.size > 0)
      },
      // Only a thin band near the top of the screen counts: the line the nav sits on.
      { rootMargin: '-36px 0px -92% 0px' },
    )
    for (const section of document.querySelectorAll('[data-dark-section]')) observer.observe(section)
    return () => observer.disconnect()
  }, [])
  return dark
}

/**
 * Stays at the top while the page scrolls, without looking like a bar: it takes the color of the section under it
 * (the page background, or the dark one over dark sections), so it never stands out from the background.
 */
export function LandingNav() {
  const dark = useOverDarkSection()
  const link = `rounded-full px-3 py-2 text-sm font-semibold ${dark ? 'text-white/70 hover:text-white' : 'text-ink-soft hover:text-brand'} ${MOTION}`
  return (
    <header className={`fixed inset-x-0 top-0 z-40 px-4 py-4 backdrop-blur-md sm:px-6 ${dark ? 'bg-ink/85 text-white' : 'bg-canvas/85 text-ink'} ${MOTION}`}>
      <nav aria-label="Principal" className="mx-auto flex max-w-6xl items-center justify-between gap-4 whitespace-nowrap">
        <Link to="/" aria-current="page" className="flex items-center gap-2 text-lg font-semibold">
          <ForkKnifeIcon size={24} weight="fill" aria-hidden className={dark ? 'text-sun' : 'text-brand'} />
          Menú
        </Link>
        <ul className="hidden items-center md:flex">
          {[
            ['#app', 'La app'],
            ['#flow', 'El servicio'],
            ['#benefits', 'Beneficios'],
            ['#design', 'Diseño'],
            ['#faq', 'Preguntas'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className={link}>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link to="/login" className={`hidden min-[26rem]:block ${link}`}>
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className={`rounded-full px-4 py-2 text-sm font-semibold active:scale-[0.98] ${dark ? 'bg-white text-ink hover:bg-sun' : 'bg-ink text-white hover:bg-brand'} ${MOTION}`}
          >
            Crear mi negocio
          </Link>
        </div>
      </nav>
    </header>
  )
}

const BENEFITS: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Una sola orden por mesa',
    body: 'Todos escanean el mismo código QR y agregan lo suyo desde su celular. La mesa ve el total en vivo y envía una vez.',
    icon: <UsersThreeIcon size={32} aria-hidden />,
  },
  {
    title: 'La cocina decide el ritmo',
    body: 'Cada orden llega como una comanda. Cocina marca cada platillo en preparación y listo, sin esperar al resto.',
    icon: <CookingPotIcon size={32} aria-hidden />,
  },
  {
    title: 'El mesero lleva lo que ya salió',
    body: 'Ve qué platillo está listo, de qué mesa es y qué falta. También cobra la cuenta al final.',
    icon: <CallBellIcon size={32} aria-hidden />,
  },
  {
    title: 'Números que sí usas',
    body: 'Ventas cobradas, platillos más pedidos y tiempos de espera por día, sin hojas de cálculo.',
    icon: <ChartBarIcon size={32} aria-hidden />,
  },
]

export function Benefits() {
  return (
    <section id="benefits" className="px-4 py-24 sm:px-6">
      <div data-leave className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div data-reveal className="space-y-4 lg:sticky lg:top-32">
            <p className="text-sm font-semibold text-brand">Beneficios</p>
            <h2 className="text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl">
              Menos vueltas a la mesa, más platillos servidos
            </h2>
          </div>
        </div>
        <ul className="divide-y divide-line-strong lg:col-span-3">
          {BENEFITS.map((benefit, index) => (
            <li key={benefit.title} data-reveal className="group flex gap-6 py-8 first:pt-0 last:pb-0">
              <span className="w-8 shrink-0 pt-1 text-sm font-semibold text-faint">0{index + 1}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-semibold text-ink">{benefit.title}</h3>
                <p className="mt-2 max-w-xl text-base text-pretty text-muted">{benefit.body}</p>
              </div>
              <span className={`hidden shrink-0 text-line-strong group-hover:-translate-y-1 group-hover:text-brand sm:block ${MOTION}`}>
                {benefit.icon}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const STEPS: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Sube tu menú',
    body: 'Registra tu negocio, agrega categorías, platillos con foto y sus opciones y extras.',
    icon: <ForkKnifeIcon size={24} weight="fill" aria-hidden />,
  },
  {
    title: 'Imprime los códigos QR',
    body: 'Cada mesa tiene el suyo. Si prefieres tablets, también funcionan con un código y un PIN.',
    icon: <QrCodeIcon size={24} weight="fill" aria-hidden />,
  },
  {
    title: 'Recibe órdenes',
    body: 'La mesa envía, cocina prepara, el mesero entrega y cobra. Todo se actualiza en vivo.',
    icon: <PaperPlaneTiltIcon size={24} weight="fill" aria-hidden />,
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="bg-subtle px-4 py-24 sm:px-6">
      <div data-leave className="mx-auto max-w-6xl space-y-12">
        <div data-reveal className="space-y-4 text-center">
          <p className="text-sm font-semibold text-brand">Cómo funciona</p>
          <h2 className="mx-auto max-w-[680px] text-4xl font-semibold tracking-tight text-ink">Listo para tu primer servicio en tres pasos</h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} data-reveal className={`relative rounded-3xl bg-surface p-6 shadow-xs hover:-translate-y-1 hover:shadow-xl ${MOTION}`}>
              <span aria-hidden className="absolute top-6 right-6 text-5xl font-semibold text-brand/15">
                {index + 1}
              </span>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">{step.icon}</span>
              <h3 className="mt-6 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-base text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const TAGLINE = 'La mesa pide cuando quiere. La cocina cocina sin interrupciones. Tú ves todo lo que pasa en tu restaurante.'

/** The words light up one at a time as the block crosses the screen (see `data-words` in the page motion). */
export function Tagline() {
  return (
    <section data-dark-section className="bg-ink px-4 py-32 sm:px-6">
      <p data-words className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        {TAGLINE.split(' ').map((word, index) => (
          <span key={index} data-word>
            {word}{' '}
          </span>
        ))}
      </p>
    </section>
  )
}

const QUESTIONS: [string, string][] = [
  ['¿Mis clientes tienen que instalar algo?', 'No. Escanean el código QR de la mesa con la cámara y el menú abre en el navegador de su celular.'],
  ['¿Necesito comprar tablets?', 'No. Con los códigos QR impresos alcanza. Si ya tienes tablets, cada mesa puede usar una con su código y su PIN.'],
  ['¿Qué pasa si varias personas piden a la vez?', 'Todos editan la misma orden de la mesa y ven los cambios en vivo. Al enviar sale una sola orden, aunque dos personas toquen el botón al mismo tiempo.'],
  ['¿Cómo se cobra la cuenta?', 'El pago es presencial. El mesero ve el total de la mesa y registra si fue en efectivo, con tarjeta u otro método.'],
  ['¿Puedo cambiar el menú durante el servicio?', 'Sí. Puedes marcar un platillo o una opción como agotados y las mesas dejan de verlos al momento.'],
  ['¿Cuántas personas de mi equipo pueden entrar?', 'Las que necesites. Creas meseros y cocina con un nombre, y cada quien entra con su código y su PIN.'],
]

export function Faq() {
  return (
    <section id="faq" className="px-4 py-24 sm:px-6">
      <div data-leave className="mx-auto max-w-3xl space-y-12">
        <div data-reveal className="space-y-4 text-center">
          <p className="text-sm font-semibold text-brand">Preguntas frecuentes</p>
          <h2 className="text-4xl font-semibold tracking-tight text-ink">Lo que nos preguntan antes de empezar</h2>
        </div>
        <ul className="space-y-3">
          {QUESTIONS.map(([question, answer]) => (
            <li key={question} data-reveal>
              <details className={`group rounded-2xl border border-line bg-surface open:border-brand/40 open:shadow-lg open:shadow-brand/5 ${MOTION}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-4 text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {question}
                  <CaretDownIcon size={20} aria-hidden className={`shrink-0 text-brand group-open:rotate-180 ${MOTION}`} />
                </summary>
                <p className="px-4 pb-4 text-base text-muted">{answer}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div data-reveal className="mx-auto max-w-6xl rounded-3xl bg-brand px-6 py-24 text-center text-brand-ink">
        <h2 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-7xl">Abre tu menú digital hoy</h2>
        <p className="mx-auto mt-6 max-w-[680px] text-lg text-pretty text-white/90">
          Registra tu negocio con un correo y una contraseña. Funciona en el navegador.
        </p>
        <Link
          to="/register"
          className={`group mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-base font-semibold text-white hover:-translate-y-0.5 active:scale-[0.98] ${MOTION}`}
        >
          Crear mi negocio
          <ArrowRightIcon size={16} weight="bold" aria-hidden className={`group-hover:translate-x-1 ${MOTION}`} />
        </Link>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-muted">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <ForkKnifeIcon size={16} weight="bold" aria-hidden className="text-brand" />
          Menú para restaurantes
        </p>
        <div className="flex gap-6">
          <Link to="/login" className={`hover:text-brand ${MOTION}`}>
            Iniciar sesión
          </Link>
          <Link to="/register" className={`hover:text-brand ${MOTION}`}>
            Crear mi negocio
          </Link>
        </div>
      </div>
    </footer>
  )
}
