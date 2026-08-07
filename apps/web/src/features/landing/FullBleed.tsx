import type { ReactNode } from 'react';

/**
 * Full-viewport-width section. Escapes AppShell main padding with matching
 * negative margins, then restores the same max-width + padding as Header
 * so content shares one left edge.
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
      className={`relative -mx-5 md:-mx-8 lg:-mx-6 ${className}`}
    >
      <div
        className={`relative mx-auto max-w-container px-5 md:px-8 lg:px-6 ${innerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
