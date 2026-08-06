/** Format integer Myanmar kyat for display. Never use float for money math. */
export function formatMmk(
  amount: number | bigint,
  locale: 'my' | 'en' = 'my',
): string {
  const n = typeof amount === 'bigint' ? Number(amount) : amount;
  if (!Number.isFinite(n)) {
    return locale === 'en' ? '—' : '—';
  }
  const formatted = new Intl.NumberFormat(
    locale === 'my' ? 'my-MM' : 'en-US',
    { maximumFractionDigits: 0 },
  ).format(Math.trunc(n));
  return locale === 'en' ? `${formatted} MMK` : `${formatted} ကျပ်`;
}
