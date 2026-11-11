import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { MOTION } from '../../shared/ui/classes.ts'

interface Look {
  name: string
  kind: string
  background: string
  surface: string
  text: string
  muted: string
  button: string
  buttonText: string
  border: string
}

// Colors of real templates of the design editor, so the sample matches what the admin gets.
const LOOKS: Look[] = [
  { name: 'Antojo', kind: 'Comida rápida', background: '#fff9f3', surface: '#ffffff', text: '#1c1917', muted: '#57534e', button: '#f26a1b', buttonText: '#1c1208', border: '#f4e3d3' },
  { name: 'Brasa', kind: 'Parrilla', background: '#000000', surface: '#1f1f1f', text: '#ffffff', muted: '#a8a8a8', button: '#f08a3c', buttonText: '#181818', border: '#f08a3c' },
  { name: 'Umami', kind: 'Sushi', background: '#f5f5f4', surface: '#ffffff', text: '#18181b', muted: '#52525b', button: '#d6300a', buttonText: '#ffffff', border: '#e7e5e4' },
  { name: 'Garden', kind: 'Saludable', background: '#f4faf5', surface: '#ffffff', text: '#13261a', muted: '#4a6352', button: '#276749', buttonText: '#ffffff', border: '#d7eadc' },
  { name: 'Costa', kind: 'Mariscos', background: '#f3f8fa', surface: '#ffffff', text: '#0f2a35', muted: '#4b6470', button: '#0e6e8c', buttonText: '#ffffff', border: '#d5e6ec' },
  { name: 'Velada', kind: 'Cena de autor', background: '#131209', surface: '#1f1f1f', text: '#f7f1e8', muted: '#b5aa9a', button: '#f2994a', buttonText: '#131209', border: '#313131' },
]

const SAMPLE = [
  { name: 'Especial de la casa', price: '$185.00' },
  { name: 'Entrada para compartir', price: '$96.00' },
  { name: 'Postre del día', price: '$72.00' },
]

/** Pick a template and the sample menu takes its colors: the same idea as the design editor, in small. */
export function ThemeShowcase() {
  const [selected, setSelected] = useState(0)
  const look = LOOKS[selected]

  return (
    <section id="design" className="px-4 py-24 sm:px-6">
      <div data-leave className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div data-reveal className="space-y-6">
          <p className="text-sm font-semibold text-brand">Diseño a tu gusto</p>
          <h2 className="max-w-[680px] text-4xl font-semibold tracking-tight text-ink">Un menú que se ve como tu negocio</h2>
          <p className="max-w-[680px] text-lg text-muted">
            Empieza con una plantilla y cambia colores, tipografía, tarjetas y secciones. Prueba una aquí mismo.
          </p>
          <div role="radiogroup" aria-label="Plantilla" className="flex flex-wrap gap-2">
            {LOOKS.map((option, index) => (
              <button
                key={option.name}
                type="button"
                role="radio"
                aria-checked={index === selected}
                onClick={() => setSelected(index)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold active:scale-[0.98] ${MOTION} ${
                  index === selected ? 'border-ink bg-ink text-white shadow-lg' : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:-translate-y-0.5'
                }`}
              >
                <span aria-hidden className="size-4 rounded-full border border-white/40" style={{ backgroundColor: option.button }} />
                {option.name}
              </button>
            ))}
          </div>
        </div>

        <div data-reveal className="flex justify-center">
          <div
            className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl transition-colors duration-500 ease-smooth"
            style={{ backgroundColor: look.background, borderColor: look.border }}
          >
            <p className="text-xs font-semibold transition-colors duration-500 ease-smooth" style={{ color: look.button }}>
              {look.kind}
            </p>
            <p className="text-2xl font-semibold transition-colors duration-500 ease-smooth" style={{ color: look.text }}>
              {look.name}
            </p>
            <ul className="mt-4 space-y-3">
              {SAMPLE.map((dish) => (
                <li
                  key={dish.name}
                  className="flex items-center gap-3 rounded-2xl border p-3 transition-colors duration-500 ease-smooth"
                  style={{ backgroundColor: look.surface, borderColor: look.border }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold transition-colors duration-500 ease-smooth" style={{ color: look.text }}>
                      {dish.name}
                    </span>
                    <span className="block text-sm transition-colors duration-500 ease-smooth" style={{ color: look.muted }}>
                      {dish.price}
                    </span>
                  </span>
                  <span
                    className="flex size-9 items-center justify-center rounded-xl transition-colors duration-500 ease-smooth"
                    style={{ backgroundColor: look.button, color: look.buttonText }}
                  >
                    <PlusIcon size={16} weight="bold" aria-hidden />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
