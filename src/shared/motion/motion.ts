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
          scrollTrigger: { trigger: layer.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
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
      lenis.destroy()
    }
  }, [])
}

/** The element leans toward the pointer while it is over `area` and settles back when it leaves. */
export function usePointerTilt(area: RefObject<HTMLElement | null>, target: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const zone = area.current
    const element = target.current
    if (!zone || !element || reducedMotion() || !window.matchMedia('(pointer: fine)').matches) return

    const rotateX = gsap.quickTo(element, 'rotationX', { duration: 0.8, ease: SMOOTH })
    const rotateY = gsap.quickTo(element, 'rotationY', { duration: 0.8, ease: SMOOTH })
    gsap.set(element, { transformPerspective: 900 })

    const move = (event: PointerEvent) => {
      const box = zone.getBoundingClientRect()
      rotateY(((event.clientX - box.left) / box.width - 0.5) * 12)
      rotateX(-((event.clientY - box.top) / box.height - 0.5) * 10)
    }
    const leave = () => {
      rotateX(0)
      rotateY(0)
    }
    zone.addEventListener('pointermove', move)
    zone.addEventListener('pointerleave', leave)
    return () => {
      zone.removeEventListener('pointermove', move)
      zone.removeEventListener('pointerleave', leave)
      gsap.killTweensOf(element)
    }
  }, [area, target])
}
