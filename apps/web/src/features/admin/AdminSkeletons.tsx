import { Skeleton, SkeletonTable } from '../../components/Skeleton';

export function AdminDashboardSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <Skeleton className="mb-3 h-4 w-28" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="rounded border border-line bg-white px-3 py-2"
          >
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2 h-6 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminMetricsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="mb-3 rounded border-2 border-line bg-white px-4 py-3">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="mt-2 h-8 w-20" />
        <Skeleton className="mt-2 h-3 w-48 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="rounded border border-line bg-white px-3 py-2"
          >
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2 h-6 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminBriefsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-36" />
      </div>
      <SkeletonTable columns={7} rows={6} />
    </div>
  );
}

export function AdminEngagementsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-36" />
      </div>
      <SkeletonTable columns={7} rows={6} />
    </div>
  );
}

/** Pending-pro queue: list rail + detail pane. */
export function AdminProfessionalsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="grid gap-2 md:grid-cols-[280px_1fr]">
        <ul className="max-h-[70vh] overflow-hidden rounded border border-line bg-white">
          {Array.from({ length: 5 }, (_, i) => (
            <li
              key={i}
              className="border-b border-line-soft px-2 py-2"
            >
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-1.5 h-2.5 w-20" />
            </li>
          ))}
        </ul>
        <div className="rounded border border-line bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-1">
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-6 w-14 rounded" />
              <Skeleton className="h-6 w-20 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-48 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[80%]" />
            <Skeleton className="h-3 w-[65%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
