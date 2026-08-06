/**
 * Concentric ripple line-art — the landing's recurring motif. Rendered as
 * plain circles so it costs nothing; color comes from a stroke-* class.
 */
export function Ripples({
  size,
  rings,
  strokeClassName,
  className = '',
  strokeWidth = 1.5,
}: {
  size: number;
  rings: number;
  strokeClassName: string;
  className?: string;
  strokeWidth?: number;
}) {
  const step = size / 2 / rings;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      {Array.from({ length: rings }, (_, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={(i + 1) * step - 1}
          strokeWidth={strokeWidth}
          className={strokeClassName}
        />
      ))}
    </svg>
  );
}
