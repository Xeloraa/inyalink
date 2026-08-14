import type { ReactNode } from 'react';

/**
 * Full-bleed background, in-flow content. Content stays inside AppShell's
 * max-width + horizontal padding so it shares the header's left edge.
 * Background paints edge-to-edge via an absolutely positioned layer that
 * escapes AppShell's <main> (mx-auto max-w-container) using a w-screen +
 * centering-transform trick.
 *
 * Important: the paint layer must stay at z-0 (not -z-10). A negative
 * z-index drops behind AppShell's `bg-paper`, so dark sections go white
 * and light text becomes invisible. And overflow-hidden must live on the
 * inner content wrapper, never on this <section> — the section is the
 * escape trick's positioning root, so clipping it there re-traps the
 * background inside <main>'s ~1180px column instead of the viewport.
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
    <section id={id} aria-labelledby={labelledBy} className="relative isolate">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen max-w-[100vw] -translate-x-1/2 ${className}`}
      />
      <div className={`relative z-[1] overflow-hidden ${innerClassName}`}>
        {children}
      </div>
    </section>
  );
}
