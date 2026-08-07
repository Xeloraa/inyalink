import type { ReactNode } from 'react';

/**
 * Full-bleed background, in-flow content. Content stays inside AppShell's
 * max-width + horizontal padding so it shares the header's left edge.
 * Background paints edge-to-edge via an absolutely positioned layer.
 */
export function FullBleed({
  children,
  className = '',
  innerClassName = '',
  id,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className="relative"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen max-w-[100vw] -translate-x-1/2 ${className}`}
      />
      <div className={`relative ${innerClassName}`}>{children}</div>
    </section>
  );
}
