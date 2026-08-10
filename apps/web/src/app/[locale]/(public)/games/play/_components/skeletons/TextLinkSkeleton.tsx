import { Skeleton } from '@/app/[locale]/_components';

/**
 * Skeleton for a centered text link such as "Save and Exit".
 * Real UI is a `text-sm` link inside a `text-center` wrapper, giving
 * ~20px of vertical footprint.
 */
export function TextLinkSkeleton() {
  return (
    <div aria-hidden className="min-h-[20px] text-center">
      <Skeleton disableAnimation className="inline-block h-4 w-40 rounded-md" />
    </div>
  );
}
