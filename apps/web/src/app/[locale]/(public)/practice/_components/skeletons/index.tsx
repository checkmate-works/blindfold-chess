import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Placeholder blocks that the practice result skeletons render alike.
 *
 * A skeleton earns its keep only by matching the real component's box, so a
 * copy that drifts is worse than no skeleton at all — it reserves the wrong
 * space and produces the layout shift it exists to prevent. Both blocks below
 * were written out with their Tailwind class lists spelled in full across four
 * and five files, which meant a change to `ExpGainDisplay` or `SignUpBannerUI`
 * silently invalidated every copy.
 *
 * The page-level skeletons still differ (problem lists, board comparisons, one
 * card vs. a grid) and stay separate; these are the parts that did not.
 */

/**
 * Mirrors `ExpGainDisplay`: the EXP row and the level / progress bar. The
 * "Level Up!" badge is rare and deliberately not reserved.
 *
 * `className` exists because two of the four callers sit in a container that
 * already spaces them and two prepend `mt-4` themselves — the same escape
 * hatch `CardLink` offers. The "EXP" label is a literal in the real component
 * too, not i18n.
 */
export function ExpGainSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${className}`.trimEnd()}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">EXP</span>
        <span className="inline-block h-5 w-20 bg-muted rounded animate-pulse" />
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-block h-4 w-12 bg-muted rounded animate-pulse" />
          <span className="inline-block h-3 w-8 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <Skeleton className="h-2 w-1/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Mirrors `RecordSection` — shown to signed-in players on modules that record
 * to `challenge_results`, in the same slot the sign-up banner occupies for
 * guests. The real card is a fixed shape (header row, two `text-sm` history
 * rows, one link row) so this reserves it exactly; the header badge is
 * optional on the real card but sits inside the row's line box, so it does
 * not change the height either way.
 */
export function RecordSectionSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-24 rounded" />
      </div>
      <div className="mt-3 space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-5 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Skeleton className="h-5 w-48 max-w-full rounded" />
      </div>
    </div>
  );
}

/** Mirrors `SignUpBannerUI` — shown to anonymous players only. */
export function SignUpBannerSkeleton() {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="w-full">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full rounded" />
        </div>
        <Skeleton className="h-9 w-28 flex-shrink-0 rounded-md" />
      </div>
    </div>
  );
}
