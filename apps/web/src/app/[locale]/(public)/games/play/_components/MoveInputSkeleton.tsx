import { Skeleton } from '@/app/[locale]/_components';

type MoveInputMode = 'button' | 'text' | 'select';

type Props = {
  mode: MoveInputMode;
  /**
   * `initial`: used during initial load / hydration. Exposes the skeleton as
   *   a live region so screen readers announce the pending state once.
   * `ai-turn`: used while the AI is thinking. Hidden from assistive tech —
   *   the adjacent "AI is thinking…" text already communicates the state,
   *   so we avoid SR chatter on every turn.
   */
  variant: 'initial' | 'ai-turn';
};

// Shape-matched minimum heights per input mode. Values chosen so that the
// skeleton ↔ real panel swap introduces zero (or near-zero) CLS.
// See MoveInputSkeleton notes below for how these were derived.
const MIN_HEIGHT_BY_MODE: Record<MoveInputMode, string> = {
  // ButtonInput: 5 rows of content + p-4 + gap-3 + mt-2 on last row ≈ 288px,
  // plus the mode-switch button row (~40px) and the outer gap-6 in the
  // parent column. Use 368px as a safe upper bound so the skeleton matches
  // the real panel with a small margin.
  button: 'min-h-[368px]',
  // MoveInput / MoveSelect render a single input/select with py-3(.5) text-lg
  // ≈ 52–56px. 56px is the submit button's h-14, which dominates MoveInput.
  text: 'min-h-[56px]',
  select: 'min-h-[56px]',
};

export function MoveInputSkeleton({ mode, variant }: Props) {
  const minHeight = MIN_HEIGHT_BY_MODE[mode];
  const ariaProps =
    variant === 'ai-turn'
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'status', 'aria-live': 'polite', 'aria-busy': true } as const);

  if (mode !== 'button') {
    return (
      <div className={`flex flex-col gap-3 p-4 bg-card rounded-lg ${minHeight}`} {...ariaProps}>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 p-4 bg-card rounded-lg ${minHeight}`} {...ariaProps}>
      {/* Row 1: K / Q / R / B / N / × (6 cells) */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} static className="w-9 h-9" />
        ))}
      </div>

      {/* Row 2: files */}
      <Skeleton static className="h-9 w-full" />

      {/* Row 3: ranks */}
      <Skeleton static className="h-9 w-full" />

      {/* Row 4: annotations + castling */}
      <div className="flex gap-6 items-center justify-center">
        <Skeleton static className="h-9 w-32" />
        <Skeleton static className="h-9 w-24" />
      </div>

      {/* Row 5: preview + 3 action buttons */}
      <div className="flex gap-2 mt-2 items-center">
        <Skeleton static className="h-14 flex-1" />
        <Skeleton static className="h-14 w-14" />
        <Skeleton static className="h-14 w-14" />
        <Skeleton static className="h-14 w-14" />
      </div>
    </div>
  );
}
