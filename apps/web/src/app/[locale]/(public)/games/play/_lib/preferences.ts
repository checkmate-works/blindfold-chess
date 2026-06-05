import type { MoveInputMode, MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

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
