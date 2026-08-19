import { Skeleton } from '@/app/[locale]/_components';

type Props = {
  className?: string;
};

/**
 * Placeholder for the collapsed `MovesPanel` header (~48px).
 *
 * `MovesPanel` is collapsed by default (`isMovesVisible=false`), so per-turn
 * expansions do not cause CLS. The real CLS is between `loading.tsx`'s
 * placeholder column and the hydrated, collapsed `MovesPanel`. This skeleton
 * mirrors the collapsed header footprint so the swap is a visual no-op.
 *
 * Outer container and header tint mirror the real `MovesPanel` when
 * `showBackground={false}`:
 *   - outer: `border border-border rounded-lg`
 *   - header: `bg-muted/30`, `min-h-[48px]` (px-4 py-3 + contents)
 *
 * Decorative by design (`aria-hidden="true"`): the sibling
 * `MoveInputSkeleton variant='initial'` already carries the single
 * `role="status"` live region for the loading area, and the inner
 * `<Skeleton>` shapes are rendered with `disableAnimation` because the
 * decorative outer container would otherwise pulse distractingly.
 */
export function MovesPanelSkeleton({ className = '' }: Props) {
  return (
    <div aria-hidden="true" className={`border border-border rounded-lg ${className}`.trim()}>
      <div className="w-full px-4 py-3 bg-muted/30 rounded-lg flex items-center justify-between min-h-[48px]">
        <Skeleton disableAnimation className="h-5 w-16 rounded-md" />
        {/* Right cluster mirrors the hydrated header: the recall header
            action pill, then the chevron. */}
        <div className="flex items-center gap-3">
          <Skeleton disableAnimation className="h-6 w-14 rounded-md" />
          <Skeleton disableAnimation className="h-5 w-5 rounded-md" />
        </div>
      </div>
    </div>
  );
}
