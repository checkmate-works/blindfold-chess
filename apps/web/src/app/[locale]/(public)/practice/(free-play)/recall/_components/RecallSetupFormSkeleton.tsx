import { Skeleton } from '@/app/[locale]/_components';

/**
 * Skeleton for {@link RecallSetupForm} — shown when `/practice/recall` is
 * entered with no `pgn`/`moves` (the common case: the `/practice` menu links
 * here with a bare `href`, no query string). Mirrors, top to bottom:
 *
 *   SectionTitle (`text-base md:text-lg ... border-b pb-2`)
 *   Tab list (`role="tablist"`, 2 tabs, `border-b`)
 *   PgnInput textarea (`h-40`)
 *   ColorSelector: its own SectionTitle + segmented control (`rounded-lg p-1`, 2 halves)
 *   Start button (`size="lg"` → `px-6 py-3 text-base`, full width)
 */
export function RecallSetupFormSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div>
        {/* SectionTitle */}
        <div className="border-b border-border pb-2">
          <Skeleton disableAnimation className="h-5 w-32" />
        </div>

        {/* Tab list (manual / lichess) */}
        <div className="mt-3 flex gap-1 border-b border-border">
          <div className="px-3 py-2">
            <Skeleton disableAnimation className="h-4 w-16" />
          </div>
          <div className="px-3 py-2">
            <Skeleton disableAnimation className="h-4 w-16" />
          </div>
        </div>

        {/* PgnInput textarea (h-40 = 160px) */}
        <div className="mt-3">
          <Skeleton disableAnimation className="h-40 w-full rounded-md" />
        </div>
      </div>

      {/* ColorSelector: its own SectionTitle + 2-way segmented control */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2">
          <Skeleton disableAnimation className="h-5 w-28" />
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          <Skeleton disableAnimation className="h-9 flex-1 rounded-md" />
          <Skeleton disableAnimation className="h-9 flex-1 rounded-md" />
        </div>
      </div>

      {/* Start button: size="lg" -> px-6 py-3 text-base (24 + 24 = 48px, h-12) */}
      <Skeleton disableAnimation className="h-12 w-full rounded-md" />
    </div>
  );
}
