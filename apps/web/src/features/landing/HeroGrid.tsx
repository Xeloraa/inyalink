import { HERO_IMAGES } from './heroImages';
import { useHeroRotation } from './useHeroRotation';

/**
 * One full-bleed photo at a time. Jade from the copy side dissolves across
 * the middle of the frame so there is no hard green seam.
 */
export function HeroGrid() {
  const { slide, setPaused } = useHeroRotation(HERO_IMAGES);
  const first = HERO_IMAGES[0];

  return (
    <div
      aria-hidden
      className="hero-stage relative h-[42vw] min-h-[10rem] w-full shrink-0 overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:min-h-0 lg:w-[62%]"
      onPointerEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setPaused(true);
      }}
      onPointerLeave={() => setPaused(false)}
    >
      {slide.srcs.map((src, layer) => (
        <img
          key={layer}
          src={src}
          alt=""
          width={1280}
          height={1280}
          sizes="(min-width: 1024px) 62vw, 100vw"
          loading={src === first ? 'eager' : 'lazy'}
          fetchPriority={layer === 0 && src === first ? 'high' : 'low'}
          decoding="async"
          draggable={false}
          className={`hero-stage-img absolute inset-0 h-full w-full object-cover ${
            slide.active === layer ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="hero-stage-fade pointer-events-none absolute inset-0" />
    </div>
  );
}
