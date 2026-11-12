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
 * - `data-tilt`: lies back in 3D and stands up as it scrolls into view.
 * - `data-leave`: fades and moves up as it scrolls out through the top, so the next section takes over.
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
      gsap.set(revealing, { y: 64, opacity: 0 })
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

      for (const element of gsap.utils.toArray<HTMLElement>('[data-tilt]')) {
        gsap.fromTo(
          element,
          { rotationX: 38, scale: 0.82, y: 48, transformPerspective: 1400, transformOrigin: '50% 100%' },
          { rotationX: 0, scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: element.parentElement, start: 'top 95%', end: 'top 20%', scrub: 0.8 } },
        )
      }

      for (const element of gsap.utils.toArray<HTMLElement>('[data-leave]')) {
        gsap.to(element, {
          y: -96,
          scale: 0.96,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: element, start: 'bottom 50%', end: 'bottom top', scrub: true },
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
