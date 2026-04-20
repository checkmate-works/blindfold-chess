import { Skeleton } from '@/app/[locale]/_components';

/**
 * Skeleton for the mode-switch toggle rendered by `MoveInputPanel` when
 * `enabledMoveInputModes.length >= 2`. Real UI is a `p-2 border rounded-md`
 * button wrapping a `w-4 h-4` icon, giving 34px of vertical footprint
 * (1 + 8 + 16 + 8 + 1).
 */
export function ModeSwitchSkeleton() {
  return (
    <div aria-hidden className="flex items-center justify-end">
      <div className="rounded-md border border-border p-2">
        <Skeleton disableAnimation className="h-4 w-4 rounded-sm" />
      </div>
    </div>
  );
}
