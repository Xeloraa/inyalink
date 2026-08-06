import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

/** How long an armed section may stay hidden before the fail-safe reveals it. */
const REVEAL_FAILSAFE_MS = 2500;

/**
 * Scroll-reveal driver for the `.reveal` / `.reveal-armed` / `.is-in`
 * classes in styles/landing.css. Content is visible by default; this hook
 * arms the hide-then-animate behaviour only when it can guarantee a reveal:
 *
 * - No IntersectionObserver, or prefers-reduced-motion: never arms —
 *   content simply stays visible with no animation.
 * - Armed: hidden before first paint (useLayoutEffect), revealed once when
 *   the element intersects, or unconditionally by a fail-safe timer so
 *   opacity:0 can never be a permanent resting state.
 */
export function useInView<T extends HTMLElement>(
  threshold = 0.2,
): { ref: RefObject<T>; className: string } {
  const ref = useRef<T>(null);
  const [phase, setPhase] = useState<'visible' | 'armed' | 'revealed'>(
    'visible',
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    setPhase('armed');
    const reveal = () => setPhase('revealed');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    const failSafe = window.setTimeout(reveal, REVEAL_FAILSAFE_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
    };
  }, [threshold]);

  const className =
    phase === 'visible'
      ? ''
      : phase === 'armed'
        ? 'reveal-armed'
        : 'reveal-armed is-in';
  return { ref, className };
}

/**
 * Slow vertical drift proportional to scroll position (hero card cluster,
 * ripple field). Skipped entirely under prefers-reduced-motion.
 */
export function useParallaxDrift<T extends HTMLElement>(
  factor: number,
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.transform = `translateY(${window.scrollY * factor}px)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [factor]);

  return ref;
}
