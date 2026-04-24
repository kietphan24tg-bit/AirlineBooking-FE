const CABIN_PLACEHOLDERS = Array.from({ length: 4 });
const BENEFIT_PLACEHOLDERS = Array.from({ length: 4 });

function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-full bg-surface-container-high ${className}`} />;
}

export default function FlightResultCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-lowest/90 shadow-sm"
    >
      <div className="animate-pulse">
        <div className="p-4 pb-5 sm:p-6 lg:p-8 lg:pb-5">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-surface-container-high sm:h-12 sm:w-12" />
                <div className="min-w-0 space-y-2 pt-1">
                  <SkeletonLine className="h-3 w-28" />
                  <SkeletonLine className="h-5 w-40 sm:w-48" />
                </div>
              </div>
              <SkeletonLine className="h-7 w-24" />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(180px,1.3fr)_minmax(0,1fr)] md:items-center md:gap-4">
              <div className="space-y-2">
                <SkeletonLine className="h-10 w-36 sm:w-40" />
                <SkeletonLine className="h-3 w-32 sm:w-40" />
              </div>

              <div className="space-y-3">
                <SkeletonLine className="mx-auto h-3 w-24 md:w-28" />
                <div className="relative h-px w-full bg-outline-variant">
                  <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-container-high" />
                </div>
              </div>

              <div className="space-y-2 md:justify-self-end">
                <SkeletonLine className="h-10 w-32 sm:w-36" />
                <SkeletonLine className="h-3 w-36 sm:w-44" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-surface-container-high border-t border-surface-container-high sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {CABIN_PLACEHOLDERS.map((_, cabinIndex) => (
            <div key={cabinIndex} className="flex h-full flex-col">
              <div className="flex h-full flex-col justify-between p-4 lg:p-5">
                <div className="mb-4 space-y-3">
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="h-8 w-28" />
                  <SkeletonLine className="h-5 w-16" />
                </div>
              </div>

              <div className="flex flex-1 flex-col border-t border-surface-container-high bg-surface-container-low/50 p-4 lg:p-5">
                <SkeletonLine className="mb-4 h-3 w-28" />
                <div className="mb-5 space-y-3">
                  {BENEFIT_PLACEHOLDERS.map((_, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-surface-container-high" />
                      <SkeletonLine
                        className={`h-3 ${benefitIndex === BENEFIT_PLACEHOLDERS.length - 1 ? 'w-3/4' : 'w-full'}`}
                      />
                    </div>
                  ))}
                </div>
                <SkeletonLine className="mt-auto h-11 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
