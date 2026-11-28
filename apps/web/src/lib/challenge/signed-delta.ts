import type { DeltaTone } from '@blindfold-chess/features/challenge-records';

/**
 * `formatSignedDelta` / `signedDeltaTone` are defined in
 * `@blindfold-chess/features/challenge-records` so the mobile app writes
 * score deltas the same way; re-exported here for the web's imports.
 */
export {
  formatSignedDelta,
  signedDeltaTone,
  type DeltaTone,
} from '@blindfold-chess/features/challenge-records';

/** Text colour classes per tone, shared so every delta reads the same. */
export const DELTA_TONE_CLASSES: Record<DeltaTone, string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};
