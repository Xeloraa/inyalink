import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HERO_TILE_COUNT,
  HERO_TILE_FADE_MS,
  HERO_TILE_INTERVAL_MS,
  HERO_TILE_STAGGER_MS,
  pickNextHeroImage,
  preloadImage,
} from './heroImages';

export type HeroTile = {
  srcs: [string, string];
  active: 0 | 1;
};

function initialTiles(pool: readonly string[]): HeroTile[] {
  return Array.from({ length: HERO_TILE_COUNT }, (_, i) => {
    const src = pool[i] ?? pool[0] ?? '';
    return { srcs: [src, src], active: 0 };
  });
}

function occupiedSrcs(
  tiles: readonly HeroTile[],
  inflight: readonly (string | null)[],
): string[] {
  const seen = new Set<string>();
  for (const tile of tiles) {
    seen.add(tile.srcs[tile.active]);
  }
  for (const src of inflight) {
    if (src) seen.add(src);
  }
  return [...seen];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Independently crossfades each tile through a shared image pool.
 * Pauses while `paused` is true; does not rotate under prefers-reduced-motion.
 */
export function useHeroRotation(pool: readonly string[]) {
  const [tiles, setTiles] = useState(() => initialTiles(pool));
  const [paused, setPaused] = useState(false);

  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const inflightRef = useRef<(string | null)[]>(
    Array.from({ length: HERO_TILE_COUNT }, () => null),
  );
  const rotatingRef = useRef(Array.from({ length: HERO_TILE_COUNT }, () => false));
  const cancelledRef = useRef(false);

  const stillThisSwap = useCallback((index: number, next: string) => {
    return !cancelledRef.current && inflightRef.current[index] === next;
  }, []);

  const rotateTile = useCallback(
    async (index: number, next: string) => {
      rotatingRef.current[index] = true;
      inflightRef.current[index] = next;
      await preloadImage(next);
      while (pausedRef.current && stillThisSwap(index, next)) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      if (!stillThisSwap(index, next)) {
        rotatingRef.current[index] = false;
        return;
      }

      const inactive = (1 - (tilesRef.current[index]?.active ?? 0)) as 0 | 1;
      setTiles((prev) => {
        const tile = prev[index];
        if (!tile) return prev;
        const srcs: [string, string] = [...tile.srcs];
        srcs[inactive] = next;
        const copy = prev.slice();
        copy[index] = { ...tile, srcs };
        return copy;
      });

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (!stillThisSwap(index, next)) {
        rotatingRef.current[index] = false;
        return;
      }

      setTiles((prev) => {
        const tile = prev[index];
        if (!tile) return prev;
        const copy = prev.slice();
        copy[index] = { ...tile, active: inactive };
        return copy;
      });

      await new Promise((resolve) => setTimeout(resolve, HERO_TILE_FADE_MS));
      if (inflightRef.current[index] === next) {
        inflightRef.current[index] = null;
      }
      rotatingRef.current[index] = false;
    },
    [stillThisSwap],
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;

    cancelledRef.current = false;
    let timer = 0;
    const nextAt = Array.from(
      { length: HERO_TILE_COUNT },
      (_, i) => performance.now() + HERO_TILE_INTERVAL_MS + i * HERO_TILE_STAGGER_MS,
    );
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
        const held = now - pauseStarted;
        for (let i = 0; i < nextAt.length; i++) {
          nextAt[i] = (nextAt[i] ?? now) + held;
        }
        pauseStarted = null;
      }

      const occupied = occupiedSrcs(tilesRef.current, inflightRef.current);
      for (let i = 0; i < HERO_TILE_COUNT; i++) {
        if (now < (nextAt[i] ?? 0) || rotatingRef.current[i]) continue;
        const next = pickNextHeroImage(pool, occupied);
        if (!next) continue;
        occupied.push(next);
        nextAt[i] = now + HERO_TILE_INTERVAL_MS;
        void rotateTile(i, next);
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
      inflightRef.current = Array.from({ length: HERO_TILE_COUNT }, () => null);
    };
  }, [pool, rotateTile]);

  return { tiles, setPaused };
}
