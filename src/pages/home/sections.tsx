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
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MOTION } from '../../shared/ui/classes.ts'

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <nav
        aria-label="Principal"
        className="flex items-center gap-2 rounded-2xl border border-line bg-surface/80 p-2 shadow-lg shadow-brand/10 backdrop-blur-md"
      >
        <Link to="/" aria-current="page" className="flex items-center gap-2 px-2 text-base font-semibold text-ink">
          <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-brand to-accent text-white">
            <ForkKnifeIcon size={16} weight="bold" aria-hidden />
          </span>
          Menú
        </Link>
        <ul className="hidden items-center sm:flex">
          {[
            ['#benefits', 'Beneficios'],
            ['#how', 'Cómo funciona'],
            ['#design', 'Diseño'],
            ['#faq', 'Preguntas'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className={`rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-subtle hover:text-ink ${MOTION}`}>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <Link to="/login" className={`rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-subtle hover:text-ink ${MOTION}`}>
          Iniciar sesión
        </Link>
        <Link
          to="/register"
          className={`rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink hover:bg-action-hover active:scale-[0.98] ${MOTION}`}
        >
          Crear mi negocio
        </Link>
      </nav>
    </header>
  )
}

const CUISINES = ['Tacos', 'Sushi', 'Hamburguesas', 'Café', 'Pizzas', 'Mariscos', 'Parrilla', 'Postres', 'Ensaladas', 'Alitas']

/** A band of cuisines that never stops moving; the list is drawn twice so the loop has no seam. */
export function CuisineTicker() {
  return (
    <div aria-hidden className="overflow-hidden bg-brand py-4 text-brand-ink">
      <div className="flex w-max motion-safe:animate-ticker">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {CUISINES.map((cuisine) => (
              <li key={cuisine} className="flex items-center gap-6 pr-6 text-lg font-semibold">
                {cuisine}
                <span className="size-2 rounded-full bg-sun" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

const BENEFITS: { title: string; body: string; icon: ReactNode; tile: string; span: string }[] = [
  {
    title: 'Una sola orden por mesa',
    body: 'Todos escanean el mismo código QR y agregan lo suyo desde su celular. La mesa ve el total en vivo y envía una vez.',
    icon: <UsersThreeIcon size={24} weight="fill" aria-hidden />,
    tile: 'bg-brand text-brand-ink',
    span: 'lg:col-span-2',
  },
  {
    title: 'La cocina decide el ritmo',
    body: 'Cada orden llega como una comanda. Cocina marca cada platillo en preparación y listo, sin esperar al resto.',
    icon: <CookingPotIcon size={24} weight="fill" aria-hidden />,
    tile: 'bg-accent text-white',
    span: '',
  },
  {
    title: 'El mesero lleva lo que ya salió',
    body: 'Ve qué platillo está listo, de qué mesa es y qué falta. También cobra la cuenta al final.',
    icon: <CallBellIcon size={24} weight="fill" aria-hidden />,
    tile: 'bg-sun text-ink',
    span: '',
  },
  {
    title: 'Números que sí usas',
    body: 'Ventas cobradas, platillos más pedidos y tiempos de espera por día, sin hojas de cálculo.',
    icon: <ChartBarIcon size={24} weight="fill" aria-hidden />,
    tile: 'bg-leaf text-white',
    span: 'lg:col-span-2',
  },
]

export function Benefits() {
  return (
    <section id="benefits" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-12">
        <div data-reveal className="space-y-4">
          <p className="text-sm font-semibold text-brand">Beneficios</p>
          <h2 className="max-w-[680px] text-4xl font-semibold tracking-tight text-ink">Menos vueltas a la mesa, más platillos servidos</h2>
        </div>
        <ul className="grid gap-4 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit.title}
              data-reveal
              className={`group rounded-3xl border border-line bg-surface p-6 shadow-xs hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10 ${MOTION} ${benefit.span}`}
            >
              <span className={`flex size-12 items-center justify-center rounded-2xl group-hover:scale-110 group-hover:-rotate-6 ${MOTION} ${benefit.tile}`}>
                {benefit.icon}
              </span>
              <h3 className="mt-6 text-xl font-semibold text-ink">{benefit.title}</h3>
              <p className="mt-2 max-w-xl text-base text-muted">{benefit.body}</p>
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
      <div className="mx-auto max-w-6xl space-y-12">
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
    <section className="bg-ink px-4 py-32 sm:px-6">
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
      <div className="mx-auto max-w-3xl space-y-12">
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
      <div
        data-reveal
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-linear-to-br from-brand to-accent px-6 py-20 text-center text-white shadow-2xl shadow-brand/30"
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full border-[40px] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full border-[40px] border-white/10" />
        <div className="relative space-y-6">
          <h2 className="mx-auto max-w-[680px] text-4xl font-semibold tracking-tight sm:text-5xl">Abre tu menú digital hoy</h2>
          <p className="mx-auto max-w-[680px] text-lg text-white/90">Registra tu negocio con un correo y una contraseña. Funciona en el navegador.</p>
          <Link
            to="/register"
            className={`group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-brand shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${MOTION}`}
          >
            Crear mi negocio
            <ArrowRightIcon size={16} weight="bold" aria-hidden className={`group-hover:translate-x-1 ${MOTION}`} />
          </Link>
        </div>
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
