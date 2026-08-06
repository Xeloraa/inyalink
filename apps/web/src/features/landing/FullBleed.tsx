import type { ReactNode } from 'react';

/**
 * Full-viewport-width section. Breaks out of AppShell's centered container
 * with a 50vw negative margin, then restores the same container inside so
 * content stays aligned with the rest of the page.
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
      className={`relative mx-[calc(50%-50vw)] ${className}`}
    >
      <div
        className={`relative mx-auto max-w-container px-5 md:px-8 lg:px-6 ${innerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
