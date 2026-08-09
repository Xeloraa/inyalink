import { useEffect, useRef, useState } from 'react';
import { FEATURED_PROS, type FeaturedPro } from './FeaturedPros';
import { useI18n } from '../../lib/i18n';

const ROTATE_MS = 6000;

/**
 * Deck positions by distance from the front: 0 front, 1 mid (peeks
 * top-left), 2 back (peeks top-right). Same fan as the original static
 * stack, expressed as transforms so cards can trade places smoothly.
 */
const POS_CLASS = [
  'z-30 translate-y-9 opacity-100 shadow-lg',
  'z-20 -translate-x-2 -rotate-[4deg] scale-[0.97] opacity-90 shadow-md',
  'z-10 translate-x-3 -translate-y-2.5 rotate-[5deg] scale-[0.94] opacity-75 shadow-sm',
];

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-sm bg-jade-50 px-md py-sm">
      <p className="text-caption text-ink-500 [overflow-wrap:anywhere]">{label}</p>
      <p className="mt-xs text-stat text-jade-600 [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function StackCard({
  pro,
  pos,
  onFront,
}: {
  pro: FeaturedPro;
  pos: number;
  onFront: () => void;
}) {
  const { t } = useI18n();
  const isFront = pos === 0;

  return (
    <div
      onMouseEnter={isFront ? undefined : onFront}
      onClick={isFront ? undefined : onFront}
      className={`col-start-1 row-start-1 w-full rounded-lg border border-line bg-white p-5 transition-[transform,opacity] duration-[600ms] ease-out motion-reduce:transition-none ${
        POS_CLASS[pos] ?? ''
      } ${isFront ? '' : 'cursor-pointer'}`}
    >
      <div className="flex items-center gap-md">
        <img
          src={pro.avatarUrl}
          alt=""
          className="h-[52px] w-[52px] rounded-full object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="text-title text-ink-900">{pro.name}</p>
          <p className="mt-xs truncate text-body-sm text-ink-500">
            {t(pro.headlineKey)}
          </p>
        </div>
      </div>

      <div className="mt-lg flex gap-sm">
        <MiniStat
          label={t('landing.cardStat.jobs')}
          value={String(pro.completed)}
        />
        <MiniStat label={t('landing.cardStat.rate')} value={pro.rate} />
        <MiniStat label={t('landing.cardStat.reply')} value={pro.response} />
      </div>

      <div className="mt-lg grid grid-cols-3 gap-1.5">
        {pro.portfolio.slice(0, 3).map((url) => (
          <div
            key={url}
            className="aspect-square overflow-hidden rounded-sm bg-jade-50"
          >
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <p className="mt-lg rounded-sm bg-jade-50 px-md py-md text-body-sm text-ink-700">
        {t(pro.reasonKey)}
      </p>
    </div>
  );
}

/**
 * Decorative rotating deck of the three featured pros. Auto-advances every
 * 6s with a 600ms crossfade; hovering or clicking a background card brings
 * it forward and restarts the clock; hovering anywhere over the deck pauses
 * rotation. aria-hidden — the real, accessible versions of these cards live
 * in MatchesSection.
 */
export function HeroMatchStack() {
  const [front, setFront] = useState(0);
  const [clockKey, setClockKey] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current) {
        setFront((f) => (f + 1) % FEATURED_PROS.length);
      }
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [clockKey]);

  function bringToFront(index: number) {
    setFront(index);
    setClockKey((k) => k + 1);
  }

  if (FEATURED_PROS.length < 3) return null;

  return (
    <div
      className="relative mx-auto grid w-full max-w-[360px] pt-8 lg:max-w-none"
      aria-hidden
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {FEATURED_PROS.map((pro, i) => (
        <StackCard
          key={pro.id}
          pro={pro}
          pos={(i - front + FEATURED_PROS.length) % FEATURED_PROS.length}
          onFront={() => bringToFront(i)}
        />
      ))}
    </div>
  );
}
