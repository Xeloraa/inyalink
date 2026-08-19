import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HERO_FADE_MS,
  HERO_INTERVAL_MS,
  pickNextHeroImage,
  preloadImage,
} from './heroImages';

export type HeroSlide = {
  srcs: [string, string];
  active: 0 | 1;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * One photo at a time: preload, then crossfade. Pauses on hover;
 * does not rotate under prefers-reduced-motion.
 */
export function useHeroRotation(pool: readonly string[]) {
  const first = pool[0] ?? '';
  const [slide, setSlide] = useState<HeroSlide>({
    srcs: [first, first],
    active: 0,
  });
  const [paused, setPaused] = useState(false);

  const slideRef = useRef(slide);
  slideRef.current = slide;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const inflightRef = useRef<string | null>(null);
  const rotatingRef = useRef(false);
  const cancelledRef = useRef(false);

  const stillThisSwap = useCallback((next: string) => {
    return !cancelledRef.current && inflightRef.current === next;
  }, []);

  const rotate = useCallback(
    async (next: string) => {
      rotatingRef.current = true;
      inflightRef.current = next;
      await preloadImage(next);
      while (pausedRef.current && stillThisSwap(next)) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      if (!stillThisSwap(next)) {
        rotatingRef.current = false;
        return;
      }

      const inactive = (1 - slideRef.current.active) as 0 | 1;
      setSlide((prev) => {
        const srcs: [string, string] = [...prev.srcs];
        srcs[inactive] = next;
        return { ...prev, srcs };
      });

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (!stillThisSwap(next)) {
        rotatingRef.current = false;
        return;
      }

      setSlide((prev) => ({ ...prev, active: inactive }));
      await new Promise((resolve) => setTimeout(resolve, HERO_FADE_MS));
      if (inflightRef.current === next) inflightRef.current = null;
      rotatingRef.current = false;
    },
    [stillThisSwap],
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;

    cancelledRef.current = false;
    let timer = 0;
    let nextAt = performance.now() + HERO_INTERVAL_MS;
    let pauseStarted: number | null = null;

    const tick = () => {
      if (cancelledRef.current) return;
      if (prefersReducedMotion()) return;

      const now = performance.now();
      if (pausedRef.current) {
        if (pauseStarted === null) pauseStarted = now;
        timer = window.setTimeout(tick, 120);
        return;
      }
      if (pauseStarted !== null) {
        nextAt += now - pauseStarted;
        pauseStarted = null;
      }

      if (now >= nextAt && !rotatingRef.current) {
        const current = slideRef.current.srcs[slideRef.current.active] ?? '';
        const next = pickNextHeroImage(pool, current);
        if (next && next !== current) {
          nextAt = now + HERO_INTERVAL_MS;
          void rotate(next);
        }
      }

      timer = window.setTimeout(tick, 120);
    };

    timer = window.setTimeout(tick, 120);

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => {
      if (media.matches) cancelledRef.current = true;
    };
    media.addEventListener('change', onMotion);

    return () => {
      cancelledRef.current = true;
      window.clearTimeout(timer);
      media.removeEventListener('change', onMotion);
      inflightRef.current = null;
    };
  }, [pool, rotate]);

  return { slide, setPaused };
}
