import { Skeleton } from '@/app/[locale]/_components';

/**
 * Skeleton for the collapsed `InlineBoardView` header (accordion trigger).
 * Real UI is a card-styled wrapper (`bg-card rounded-md border
 * border-border overflow-hidden`) whose trigger button is
 * `flex items-center justify-between px-4 py-3` with `text-sm` contents,
 * giving ~46px of vertical footprint.
 */
export function InlineBoardHeaderSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex min-h-[46px] items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton disableAnimation className="h-4 w-4 rounded-sm" />
          <Skeleton disableAnimation className="h-4 w-24" />
        </div>
        <Skeleton disableAnimation className="h-3 w-3 rounded-sm" />
      </div>
    </div>
  );
}
