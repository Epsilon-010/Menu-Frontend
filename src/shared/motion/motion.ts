import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useLayoutEffect, type RefObject } from 'react'

gsap.registerPlugin(ScrollTrigger)

/** The app's weighted deceleration (the `ease-smooth` curve) as a GSAP ease. */
const SMOOTH = 'expo.out'

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Scroll and entrance motion for everything inside `scope`, driven by data attributes so sections stay plain markup:
 *
 * - `data-enter`: plays once when the page opens, one element after another in document order.
 * - `data-reveal`: rises and fades in the first time it scrolls into view; neighbours entering together stagger.
 * - `data-words`: its `data-word` children light up one at a time as the block crosses the viewport.
 * - `data-parallax="<px>"`: drifts that many pixels while its section scrolls by.
 * - `data-story`: a tall section whose `data-story-panel` children take turns on a screen that stays put (CSS
 *   `sticky`) while it scrolls by; inside a panel, `data-from="left|right|up"` says where each part comes from.
 *
 * With reduced motion nothing moves: every element simply stays visible.
 */
export function usePageMotion(scope: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root || reducedMotion()) return

    const context = gsap.context(() => {
      const entering = gsap.utils.toArray<HTMLElement>('[data-enter]')
      if (entering.length > 0) {
        gsap.from(entering, { y: 32, opacity: 0, duration: 0.9, ease: SMOOTH, stagger: 0.08, clearProps: 'transform' })
      }

      const revealing = gsap.utils.toArray<HTMLElement>('[data-reveal]')
      gsap.set(revealing, { y: 32, opacity: 0 })
      ScrollTrigger.batch(revealing, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.8, ease: SMOOTH, stagger: 0.08 }),
      })

      for (const block of gsap.utils.toArray<HTMLElement>('[data-words]')) {
        gsap.fromTo(
          block.querySelectorAll('[data-word]'),
          { opacity: 0.3 },
          { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: block, start: 'top 80%', end: 'bottom 55%', scrub: 0.6 } },
        )
      }

      for (const layer of gsap.utils.toArray<HTMLElement>('[data-parallax]')) {
        gsap.to(layer, {
          y: Number(layer.dataset.parallax),
          ease: 'none',
          // Clamped: a layer already on screen when the page opens starts from its drawn position.
          scrollTrigger: {
            trigger: layer.closest('section') ?? layer.parentElement,
            start: 'clamp(top bottom)',
            end: 'bottom top',
            scrub: 0.8,
          },
        })
      }

      for (const story of gsap.utils.toArray<HTMLElement>('[data-story]')) {
        const timeline = gsap.timeline({
          defaults: { ease: 'power2.out', duration: 0.5 },
          scrollTrigger: { trigger: story, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
        })
        const panels = Array.from(story.querySelectorAll<HTMLElement>('[data-story-panel]'))
        panels.forEach((panel, index) => {
          const from = (side: string) => panel.querySelectorAll(`[data-from="${side}"]`)
          if (index > 0) {
            timeline
              .fromTo(panel, { autoAlpha: 0 }, { autoAlpha: 1 })
              .fromTo(from('left'), { xPercent: -40 }, { xPercent: 0 }, '<')
              .fromTo(from('right'), { xPercent: 40 }, { xPercent: 0 }, '<')
              .fromTo(from('up'), { y: 96, scale: 0.9 }, { y: 0, scale: 1 }, '<')
          }
          // Each panel holds the screen for a while before the next one takes over.
          timeline.to({}, { duration: 1 })
          if (index < panels.length - 1) {
            timeline
              .to(panel, { autoAlpha: 0, ease: 'power2.in' })
              .to(from('left'), { xPercent: -20, ease: 'power2.in' }, '<')
              .to(from('right'), { xPercent: 20, ease: 'power2.in' }, '<')
              .to(from('up'), { y: -64, scale: 0.94, ease: 'power2.in' }, '<')
          }
        })
      }
    }, root)

    return () => context.revert()
  }, [scope])
}

/** Smooth, weighted page scrolling (Lenis) while the page is mounted, in step with the scroll animations. */
export function useSmoothScroll(): void {
  useLayoutEffect(() => {
    if (reducedMotion()) return
    const lenis = new Lenis({ anchors: true })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      // Back to GSAP's default, so pages without smooth scrolling keep their protection against long frames.
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  }, [])
}
