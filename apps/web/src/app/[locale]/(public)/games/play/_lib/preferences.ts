import type { MoveInputMode, MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Narrow shape shared by `GamePreferences` and `PeekPreferenceHint`: any
 * object carrying the two board-display keys. Lets the helpers below accept
 * both post-hydration `preferences` and pre-hydration cookie `hint` inputs
 * without a bespoke adapter at every call site.
 */
type PeekPredicateInput = Pick<GamePreferences, 'peekMode' | 'boardVisibility'>;

/**
 * Returns true when the "Show Board" action row button should be reserved/rendered.
 * This mirrors the Show Board button's rendering condition in GameInProgressPanel
 * and is reused by the initializing skeleton so both stay in sync.
 *
 * Requires `boardVisibility === 'peek'` AND `peekMode === 'modal'` — the button
 * is irrelevant when the board is always visible (no need to "show" it) or
 * never visible at all.
 */
export function shouldShowModalPeekButton(input: PeekPredicateInput | PeekPreferenceHint): boolean {
  return input.boardVisibility === 'peek' && input.peekMode === 'modal';
}

/**
 * Returns true when the inline peek board (with its ~46px header chrome and
 * collapse toggle) should be reserved/rendered. This mirrors the
 * `InlineBoardView` rendering condition in `PlayClient` and is reused by the
 * initializing skeleton (`InlineBoardHeaderSkeleton`) so both stay in sync.
 *
 * Specifically requires `boardVisibility === 'peek'` — the always-visible
 * variant uses {@link shouldShowAlwaysVisibleBoard} and renders a different
 * layout without the collapse chrome.
 */
export function shouldShowInlinePeekHeader(
  input: PeekPredicateInput | PeekPreferenceHint
): boolean {
  return input.boardVisibility === 'peek' && input.peekMode === 'inline';
}

/**
 * Returns true when the board should be permanently visible in the page
 * column (no peek chrome, no collapse). The piece-visibility / appearance
 * settings remain the blindfold mechanism in this mode — see
 * {@link BoardVisibility} for the design rationale.
 */
export function shouldShowAlwaysVisibleBoard(
  input: PeekPredicateInput | PeekPreferenceHint
): boolean {
  return input.boardVisibility === 'always';
}

/**
 * Returns true when the full-screen "AI is thinking" pulse overlay should
 * fire on each AI turn. The pulse is the primary "the game is alive"
 * signal in modes where the player sees nothing change during the AI's
 * turn, and is redundant (or actively noisy) in modes where the player
 * does see the board move:
 *
 * - `boardVisibility === 'always'` → the piece literally moves in front
 *   of the player; the pulse adds nothing.
 * - `boardVisibility === 'peek' && peekMode === 'inline'` → the page
 *   scrolls to the title and the inline board auto-collapses on commit,
 *   so the user reads the "AI is thinking…" status text directly. A
 *   full-screen tint on top of that text is redundant.
 * - Everything else (`peek`+`modal`, `never`+anything) → the pulse is
 *   the only confirmation that something is happening, so it fires.
 *
 * Centralised here so the policy can be unit-tested across the full
 * (boardVisibility × peekMode) grid; PlayPageClient reads from this
 * helper instead of inlining the boolean.
 */
export function shouldShowAiPulse(input: PeekPredicateInput | PeekPreferenceHint): boolean {
  if (input.boardVisibility === 'always') return false;
  if (input.boardVisibility === 'peek' && input.peekMode === 'inline') return false;
  return true;
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
