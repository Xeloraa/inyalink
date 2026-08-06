/**
 * InyaLink mark — "The Drop", v2. Ripples on Inya Lake seen from above:
 * a drop, one full ring, and an outer ring left open at the top-right so
 * it reads as moving water rather than a target. Concentric = one goal
 * reaching outward to the right people. Draws in currentColor; the 2px
 * strokes and ~2.2px gaps stay legible at 24px.
 */
export function LogoMark({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <circle
        cx="12"
        cy="12"
        r="5.8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M13.74 2.15A10 10 0 1 0 21.85 10.26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
