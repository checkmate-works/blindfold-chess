import { Skeleton } from '@/app/[locale]/_components';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { ModeSwitchSkeleton } from './skeletons';

type MoveInputMode = GamePreferences['moveInputMode'];

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
  /**
   * Whether the real `MoveInputPanel` will render its mode-switch button row
   * (i.e. the user has 2+ input modes enabled). When true, the skeleton adds
   * the height of the switcher row plus the parent `gap-6` so the swap does
   * not shift layout. Defaults to `false`, which matches the default
   * preferences (`enabledMoveInputModes: ['button']`).
   *
   * For `mode === 'button'`, the additional height is baked into the outer
   * `min-h-[346px]`. For `mode === 'text'` / `'select'`, a `ModeSwitchSkeleton`
   * is appended as a sibling inside the same wrapper so the gap is covered by
   * the wrapper's own flex spacing (`gap-6`) rather than the parent's.
   */
  hasModeSwitch?: boolean;
};

// Shape-matched minimum heights per input mode. Values chosen so that the
// skeleton ↔ real panel swap introduces zero (or near-zero) CLS.
//
// ButtonInput (default preferences, single enabled mode, no switcher row):
//   p-4 vertical         : 32px (py-4 × 2)
//   gap-3 × 4 between 5 rows : 48px
//   Row 1 (pieces)       : 36px (h-9)
//   Row 2 (files)        : 36px (h-9)
//   Row 3 (ranks)        : 36px (h-9)
//   Row 4 (annotations)  : 36px (h-9)
//   Row 5 mt-2           :  8px
//   Row 5 preview/submit : 56px (h-14)
//   Total                : 288px
//
// When the mode-switch button row is present (2+ enabled modes), the parent
// `MoveInputPanel` returns a React fragment whose two children (the input and
// the switcher row) sit inside `GameInProgressPanel`'s `flex flex-col gap-6`.
// So the rendered height is the sum of:
//   ButtonInput                        : 288px
//   parent gap-6 (between siblings)    :  24px
//   Mode switcher row (p-2 + h-4 icon) :  34px  (1 + 8 + 16 + 8 + 1)
//   Total                              : 346px
//
// MoveInput (text mode) and MoveSelect render raw form elements without a
// `p-4 bg-card` wrapper, so the skeleton for text/select must match that bare
// shape — otherwise the swap introduces both height CLS and a surface-style
// jank (card → bare form). The two modes have different real-panel heights,
// so their reservations are tracked separately below.
//
// MoveInput (text mode), both breakpoints:
//   Input row dominated by submit button `h-14`     : 56px
//   (Input element itself is `py-3 text-lg border`  = 24 + 28 + 2 = 54px,
//    but the sibling `h-14` submit pins the row to 56px.)
//   `MIN_HEIGHT_TEXT` = 56px matches the real row exactly.
//
// MoveSelect (trigger button `px-4 py-3.5 md:py-3 border text-lg md:text-base`):
//   Mobile  : py-3.5 (28) + text-lg line-height (28) + border (2) = 58px
//   Desktop : py-3   (24) + text-base line-height (24) + border (2) = 50px
//   `MIN_HEIGHT_SELECT` is responsive so the skeleton matches both
//   breakpoints. Previously a single `min-h-[56px]` constant covered both
//   modes; that under-reserved by 2px on mobile select (58 vs 56),
//   producing a barely-perceptible downward nudge when the real select
//   hydrated. Splitting the constant removes that shift.
//
// When `hasModeSwitch=true`, `ModeSwitchSkeleton` is appended inside the same
// wrapper with internal `gap-6`, so the rendered height grows by
// 24 (gap-6) + 34 (switcher) = 58px. The `min-h-*` constants bound the
// no-switcher case; the wrapper's `flex flex-col` naturally expands when the
// switcher sibling is present, so no separate `min-h` constant is needed.
const MIN_HEIGHT_BUTTON = 'min-h-[288px]';
const MIN_HEIGHT_BUTTON_WITH_SWITCHER = 'min-h-[346px]';
const MIN_HEIGHT_TEXT = 'min-h-[56px]';
const MIN_HEIGHT_SELECT = 'min-h-[58px] md:min-h-[50px]';

export function MoveInputSkeleton({ mode, variant, hasModeSwitch = false }: Props) {
  const ariaProps =
    variant === 'ai-turn'
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'status', 'aria-live': 'polite', 'aria-busy': true } as const);

  if (mode === 'select') {
    // MoveSelect renders a single trigger button styled as
    // `px-4 py-3.5 md:py-3 border rounded-lg text-lg md:text-base` with a
    // chevron on the right. No `p-4 bg-card` wrapper. The switcher row, when
    // present, is a sibling inside the real `MoveInputPanel` fragment — we
    // emulate that by rendering it inside this wrapper with `gap-6` to match
    // the parent's spacing.
    return (
      <div className={`flex w-full flex-col gap-6 ${MIN_HEIGHT_SELECT}`} {...ariaProps}>
        <div className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3.5 md:py-3">
          <Skeleton disableAnimation className="h-5 w-32" />
          <Skeleton disableAnimation className="ml-2 h-4 w-4 rounded-sm" />
        </div>
        {hasModeSwitch && <ModeSwitchSkeleton />}
      </div>
    );
  }

  if (mode === 'text') {
    // MoveInput renders a `flex gap-2 items-center` form with an `h-14` input
    // (via `py-3 text-lg` that reaches ~56px) and an `h-14 w-14` submit button.
    // Match that shape exactly so both the input row and the optional switcher
    // sibling line up with the real panel.
    return (
      <div className={`flex w-full flex-col gap-6 ${MIN_HEIGHT_TEXT}`} {...ariaProps}>
        <div className="flex items-center gap-2">
          <Skeleton disableAnimation className="h-14 flex-1 rounded-lg" />
          <Skeleton disableAnimation className="h-14 w-14 rounded-lg" />
        </div>
        {hasModeSwitch && <ModeSwitchSkeleton />}
      </div>
    );
  }

  const buttonMinHeight = hasModeSwitch ? MIN_HEIGHT_BUTTON_WITH_SWITCHER : MIN_HEIGHT_BUTTON;

  return (
    <div className={`flex flex-col gap-3 p-4 bg-card rounded-lg ${buttonMinHeight}`} {...ariaProps}>
      {/* Row 1: K / Q / R / B / N / × (6 cells) */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} disableAnimation className="w-9 h-9" />
        ))}
      </div>

      {/* Row 2: files */}
      <Skeleton disableAnimation className="h-9 w-full" />

      {/* Row 3: ranks */}
      <Skeleton disableAnimation className="h-9 w-full" />

      {/* Row 4: annotations + castling */}
      <div className="flex gap-6 items-center justify-center">
        <Skeleton disableAnimation className="h-9 w-32" />
        <Skeleton disableAnimation className="h-9 w-24" />
      </div>

      {/* Row 5: preview + 3 action buttons */}
      <div className="flex gap-2 mt-2 items-center">
        <Skeleton disableAnimation className="h-14 flex-1" />
        <Skeleton disableAnimation className="h-14 w-14" />
        <Skeleton disableAnimation className="h-14 w-14" />
        <Skeleton disableAnimation className="h-14 w-14" />
      </div>
    </div>
  );
}
