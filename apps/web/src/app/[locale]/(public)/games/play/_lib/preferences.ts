import type { MoveInputMode, MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Narrow shape shared by `GamePreferences` and `PeekPreferenceHint`: any
 * object carrying the two peek-related keys. Lets the helpers below accept
 * both post-hydration `preferences` and pre-hydration cookie `hint` inputs
 * without a bespoke adapter at every call site.
 */
type PeekPredicateInput = Pick<GamePreferences, 'peekMode' | 'showBoardButtonInGame'>;

/**
 * Returns true when the "Show Board" action row button should be reserved/rendered.
 * This mirrors the Show Board button's rendering condition in GameInProgressPanel
 * and is reused by the initializing skeleton so both stay in sync.
 *
 * Accepts either the full `GamePreferences` object (post-hydration) or the
 * `PeekPreferenceHint` shape (SSR cookie hint), so the pre- and post-hydration
 * skeletons can share one predicate.
 */
export function shouldShowModalPeekButton(input: PeekPredicateInput | PeekPreferenceHint): boolean {
  return input.showBoardButtonInGame && input.peekMode === 'modal';
}

/**
 * Returns true when the inline peek board (with its ~46px header) should be
 * reserved/rendered. This mirrors the InlineBoardView rendering condition in
 * PlayClient and is reused by the initializing skeleton (InlineBoardHeaderSkeleton)
 * so both stay in sync.
 *
 * Accepts either the full `GamePreferences` object (post-hydration) or the
 * `PeekPreferenceHint` shape (SSR cookie hint), so the pre- and post-hydration
 * skeletons can share one predicate.
 */
export function shouldShowInlinePeekHeader(
  input: PeekPredicateInput | PeekPreferenceHint
): boolean {
  return input.showBoardButtonInGame && input.peekMode === 'inline';
}

/**
 * Props consumed by `MoveInputSkeleton` that are derived from a move-input
 * preference source. Kept intentionally narrow so callers pass only these two
 * values through and don't accidentally couple to other skeleton concerns.
 */
export type MoveInputSkeletonProps = {
  mode: MoveInputMode;
  hasModeSwitch: boolean;
};

/**
 * Derive the `MoveInputSkeleton` props (`mode`, `hasModeSwitch`) from a
 * cookie-sourced `MoveInputPreferenceHint`. Shared by the pre-hydration branch
 * of `PlayClient` and the route-segment `loading.tsx` so both stay in sync.
 */
export function deriveMoveInputSkeletonProps(
  hint: MoveInputPreferenceHint
): MoveInputSkeletonProps {
  return {
    mode: hint.mode,
    hasModeSwitch: hint.enabledModes.length >= 2,
  };
}
