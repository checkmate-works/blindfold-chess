import { Skeleton } from '@/app/[locale]/_components';

/**
 * Skeleton for a single action button (Show Board / Undo / Resign).
 * Real UI shape is `px-4 py-2 border rounded-md` + `text-base` line-height (24)
 * + border (2), giving ~42px of vertical footprint. The label is hidden below
 * the `md` breakpoint to match the real ActionButton (`hidden md:inline`).
 */
export function ActionButtonSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-[42px] items-center justify-center gap-2 rounded-md border border-border px-4 py-2"
    >
      <Skeleton disableAnimation className="h-4 w-4 rounded-sm" />
      <Skeleton disableAnimation className="hidden h-4 w-14 md:block rounded-md" />
    </div>
  );
}
