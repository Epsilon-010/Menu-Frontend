import { useRef } from 'react'
import { usePageMotion, useSmoothScroll } from '../shared/motion/motion.ts'
import { Hero } from './home/Hero.tsx'
import { Benefits, CuisineTicker, Faq, FinalCta, HowItWorks, LandingFooter, LandingNav, Tagline } from './home/sections.tsx'
import { ThemeShowcase } from './home/ThemeShowcase.tsx'

/** The public landing page: what the product does for a restaurant, and one action (create the business). */
export function HomePage() {
  const page = useRef<HTMLDivElement>(null)
  useSmoothScroll()
  usePageMotion(page)

  return (
    <div ref={page}>
      <a
        href="#main"
        className="sr-only rounded-lg bg-action px-3 py-2 text-sm font-semibold text-action-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
      >
        Saltar al contenido
      </a>
      <LandingNav />
      <main id="main">
        <Hero />
        <CuisineTicker />
        <Benefits />
        <HowItWorks />
        <Tagline />
        <ThemeShowcase />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
