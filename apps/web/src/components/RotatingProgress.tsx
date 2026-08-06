import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';

const ROTATING_KEYS = [
  'progress.rotate.understanding',
  'progress.rotate.searching',
  'progress.rotate.preparing',
] as const;

const INTERVAL_MS = 2000;

/**
 * Rotating Burmese (or English) progress line during AI calls.
 * Never a bare spinner — design system § Loading states.
 */
export function RotatingProgress({
  active,
}: {
  active: boolean;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ROTATING_KEYS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <p
      className="font-myanmar text-body-sm leading-burmese text-ink-500"
      role="status"
      aria-live="polite"
    >
      {t(ROTATING_KEYS[index] ?? ROTATING_KEYS[0])}
    </p>
  );
}
