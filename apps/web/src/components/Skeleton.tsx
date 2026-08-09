type SkeletonProps = {
  className?: string;
};

/** Grey pulse block — compose into layout-matching placeholders. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`rounded-sm bg-line-soft motion-safe:animate-pulse ${className}`}
    />
  );
}

type SkeletonTableProps = {
  columns: number;
  rows?: number;
  /** Optional column width classes (Tailwind), cycled if shorter than columns. */
  widths?: string[];
};

/** Admin-style table shell with pulsing rows. */
export function SkeletonTable({
  columns,
  rows = 6,
  widths = ['w-40', 'w-16', 'w-24', 'w-12', 'w-16', 'w-28', 'w-20'],
}: SkeletonTableProps) {
  return (
    <div
      className="overflow-x-auto rounded border border-line bg-white"
      role="status"
      aria-busy="true"
    >
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead className="bg-line-soft">
          <tr>
            {Array.from({ length: columns }, (_, i) => (
              <th key={i} className="px-2 py-1.5">
                <Skeleton className={`h-2.5 ${widths[i % widths.length]}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} className="border-t border-line-soft">
              {Array.from({ length: columns }, (_, c) => (
                <td key={c} className="px-2 py-2">
                  <Skeleton
                    className={`h-3 ${widths[(c + r) % widths.length]}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
