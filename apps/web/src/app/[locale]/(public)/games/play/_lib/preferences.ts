import type { MoveInputMode, MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Returns true when the full-screen "AI is thinking" pulse overlay should fire
 * on each AI turn. It is the only "something happened" cue when the board is
 * hidden, so it fires in the blindfold modes (`peek` / `never`) and is
 * suppressed when the board is always visible (the move is seen directly).
 *
 * Centralised here so the policy can be unit-tested; PlayPageClient reads from
 * this helper instead of inlining the boolean.
 */
export function shouldShowAiPulse(input: Pick<GamePreferences, 'boardVisibility'>): boolean {
  return input.boardVisibility !== 'always';
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
