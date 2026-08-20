/** 15-image pool for the landing hero. One is visible at a time, crossfading through the pool. */
export const HERO_IMAGES = [
  '/images/hero/hero-01.webp',
  '/images/hero/hero-02.webp',
  '/images/hero/hero-03.webp',
  '/images/hero/hero-04.webp',
  '/images/hero/hero-05.webp',
  '/images/hero/hero-06.webp',
  '/images/hero/hero-07.webp',
  '/images/hero/hero-08.webp',
  '/images/hero/hero-09.webp',
  '/images/hero/hero-10.webp',
  '/images/hero/hero-11.webp',
  '/images/hero/hero-12.webp',
  '/images/hero/hero-13.webp',
  '/images/hero/hero-14.webp',
  '/images/hero/hero-15.webp',
] as const;

export const HERO_TILE_COUNT = 1;
export const HERO_TILE_INTERVAL_MS = 6000;
export const HERO_TILE_FADE_MS = 600;
/** Spread swaps across one interval so simultaneous tiles never fire together. */
export const HERO_TILE_STAGGER_MS = HERO_TILE_INTERVAL_MS / HERO_TILE_COUNT;

export type HeroImageSrc = (typeof HERO_IMAGES)[number];

/**
 * Choose a pool image that is not currently on screen (or fading in).
 * With 15 images and 4 tiles this always has candidates.
 */
export function pickNextHeroImage(
  pool: readonly string[],
  occupied: readonly string[],
  random: () => number = Math.random,
): string {
  const used = new Set(occupied);
  const available = pool.filter((src) => !used.has(src));
  if (available.length === 0) {
    return pool.find((src) => src !== occupied[0]) ?? pool[0] ?? '';
  }
  const index = Math.floor(random() * available.length);
  return available[index] ?? available[0] ?? '';
}

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    img.onload = () => {
      if (typeof img.decode === 'function') {
        void img.decode().then(done, done);
      } else {
        done();
      }
    };
    img.onerror = done;
    img.src = src;
  });
}
