import type { ReactNode } from 'react';

/**
 * Full-bleed background, in-flow content. Content stays inside AppShell's
 * max-width + horizontal padding so it shares the header's left edge.
 * Background paints edge-to-edge via an absolutely positioned layer.
 *
 * Important: the paint layer must stay at z-0 (not -z-10). A negative
 * z-index drops behind AppShell's `bg-paper`, so dark sections go white
 * and light text becomes invisible.
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
      className="relative isolate overflow-hidden"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen max-w-[100vw] -translate-x-1/2 ${className}`}
      />
      <div className={`relative z-[1] ${innerClassName}`}>{children}</div>
    </section>
  );
}
