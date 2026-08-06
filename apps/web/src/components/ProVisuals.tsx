function initials(name: string): string {
  const parts = name.replace(/·/g, ' ').split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

const TILE_TONES = [
  'bg-[#d5e0dc]',
  'bg-[#cfd9d4]',
  'bg-[#e0e6e2]',
  'bg-[#c8d4cf]',
];

export function Avatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-jade text-lg font-semibold text-paper"
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export function PortfolioThumbs({
  items,
  label,
}: {
  items: Array<{
    id: string;
    caption: string | null;
    externalUrl: string | null;
    storagePath?: string | null;
  }>;
  label: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <ul className="grid grid-cols-3 gap-2">
        {items.map((item, i) => (
          <li
            key={item.id}
            className={`aspect-square overflow-hidden rounded-md border border-line ${TILE_TONES[i % TILE_TONES.length]}`}
          >
            <div className="flex h-full flex-col justify-end p-2">
              <span className="line-clamp-3 text-xs leading-[1.5] text-ink/80">
                {item.caption ?? '—'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
