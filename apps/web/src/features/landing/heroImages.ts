/** 15-image pool for the landing hero. One is visible at a time. */
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

export const HERO_INTERVAL_MS = 6000;
export const HERO_FADE_MS = 600;

export type HeroImageSrc = (typeof HERO_IMAGES)[number];

/** Next image from the pool, never repeating the one currently on screen. */
export function pickNextHeroImage(
  pool: readonly string[],
  current: string,
  random: () => number = Math.random,
): string {
  const available = pool.filter((src) => src !== current);
  if (available.length === 0) return current;
  const index = Math.floor(random() * available.length);
  return available[index] ?? available[0] ?? current;
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
