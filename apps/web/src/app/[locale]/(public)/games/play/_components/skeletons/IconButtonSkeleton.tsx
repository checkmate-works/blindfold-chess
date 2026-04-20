import { Skeleton } from '@/app/[locale]/_components';

/**
 * Skeleton for an icon-only button (Operation Log trigger).
 * Real UI is a bare button wrapping a `w-4 h-4` icon aligned to the right
 * of a `flex justify-end` container, giving ~24px of vertical footprint.
 */
export function IconButtonSkeleton() {
  return (
    <div aria-hidden className="flex min-h-[24px] justify-end">
      <Skeleton disableAnimation className="h-4 w-4 rounded-sm" />
    </div>
  );
}
