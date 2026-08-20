import { HERO_IMAGES } from './heroImages';
import { useHeroRotation, type HeroTile } from './useHeroRotation';

const EAGER_SRC = new Set<string>(HERO_IMAGES.slice(0, 1));

function Tile({ tile, index }: { tile: HeroTile; index: number }) {
  return (
    <div className="hero-grid-tile absolute inset-0 overflow-hidden bg-jade-800">
      {tile.srcs.map((src, layer) => {
        const eager = EAGER_SRC.has(src);
        return (
          <img
            key={layer}
            src={src}
            alt=""
            width={1280}
            height={698}
            sizes="(min-width: 1024px) 50vw, 100vw"
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
 * One large photo filling the full right half of the hero, edge to edge,
 * full height. Crossfades through the pool one image at a time. Jade
 * fades in from the copy side.
 */
export function HeroGrid() {
  const { tiles, setPaused } = useHeroRotation(HERO_IMAGES);
  const tile = tiles[0];
  if (!tile) return null;

  return (
    <div
      aria-hidden
      className="relative h-[46vw] min-h-[11rem] w-full shrink-0 lg:h-auto lg:min-h-0 lg:flex-1 lg:self-stretch"
      onPointerEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setPaused(true);
      }}
      onPointerLeave={() => setPaused(false)}
    >
      <Tile tile={tile} index={0} />
      <div className="hero-stage-fade pointer-events-none absolute inset-0" />
    </div>
  );
}
