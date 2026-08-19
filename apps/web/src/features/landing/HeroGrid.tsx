import { HERO_IMAGES } from './heroImages';
import { useHeroRotation, type HeroTile } from './useHeroRotation';

const EAGER_SRC = new Set<string>(HERO_IMAGES.slice(0, 4));

function Tile({ tile, index }: { tile: HeroTile; index: number }) {
  return (
    <div className="hero-grid-tile relative overflow-hidden bg-jade-800">
      {tile.srcs.map((src, layer) => {
        const eager = EAGER_SRC.has(src);
        return (
          <img
            key={layer}
            src={src}
            alt=""
            width={640}
            height={640}
            sizes="(min-width: 1024px) 25vw, 25vw"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={index === 0 && layer === 0 ? 'high' : 'low'}
            decoding="async"
            draggable={false}
            className={`absolute inset-0 h-full w-full object-cover brightness-[0.62] contrast-[1.06] saturate-[0.88] ${
              tile.active === layer ? 'opacity-100' : 'opacity-0'
            }`}
          />
        );
      })}
    </div>
  );
}

/**
 * 2×2 mosaic on large screens; a single row of four on smaller ones.
 * Tiles crossfade one at a time. Jade fades in from the copy side.
 */
export function HeroGrid() {
  const { tiles, setPaused } = useHeroRotation(HERO_IMAGES);

  return (
    <div
      aria-hidden
      className="relative h-[22vw] min-h-[6.5rem] w-full shrink-0 lg:h-auto lg:min-h-0 lg:flex-1 lg:self-stretch"
      onPointerEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setPaused(true);
      }}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="grid h-full grid-cols-4 grid-rows-1 gap-px bg-jade-950 lg:grid-cols-2 lg:grid-rows-2">
        {tiles.map((tile, index) => (
          <Tile key={index} tile={tile} index={index} />
        ))}
      </div>
      <div className="hero-stage-fade pointer-events-none absolute inset-0" />
    </div>
  );
}
