export type CountdownState = {
  value: number | null;
};

/** Duration in ms to display each countdown number (3, 2, 1) */
export const COUNTDOWN_STEP_DURATION = 1000;

/** Duration in ms to display "START!" (when value === 0) */
export const COUNTDOWN_START_DISPLAY_DURATION = 500;

/** Default initial countdown value */
export const COUNTDOWN_INITIAL_VALUE = 3;

/**
 * Pure countdown state machine.
 * Given the current countdown value, returns the next value after the appropriate delay.
 *
 * - value > 0: next value is value - 1 (after COUNTDOWN_STEP_DURATION)
 * - value === 0: next value is null (after COUNTDOWN_START_DISPLAY_DURATION) — "START!" phase complete
 * - value === null: countdown is finished, no transition
 */
export function getNextCountdownValue(
  current: number | null,
): { nextValue: number | null; delayMs: number } | null {
  if (current === null) {
    return null;
  }

  if (current === 0) {
    return { nextValue: null, delayMs: COUNTDOWN_START_DISPLAY_DURATION };
  }

  return { nextValue: current - 1, delayMs: COUNTDOWN_STEP_DURATION };
}

/**
 * Returns true if the countdown is still active (not yet finished).
 */
export function isCountdownActive(value: number | null): boolean {
  return value !== null;
}
