import type { MoveLogEntry } from './move-log-entry';

export type RecallStats = {
  /** User-engaged moves = nailed + struggled + missed. Opponent auto-fills are excluded. */
  total: number;
  /** Recalled correctly with no wrong attempt. */
  nailed: number;
  /** Recalled correctly, but only after one or more wrong attempts. */
  struggled: number;
  /** Gave up on the move ("I don't know" / "auto-fill all"). */
  missed: number;
  /** Total wrong attempts entered (can exceed the move count — several per move). */
  mistakes: number;
  /** nailed + struggled. */
  recalled: number;
  /** Recall rate over engaged moves, 0..1 (0 when there are no engaged moves). */
  recallRate: number;
};

/**
 * Derive the postmortem recall report from the move log.
 *
 * The log is an ordered stream: `incorrect` entries precede the resolution of
 * the move they belong to (`correct` when the user finally entered it, or
 * `skipped` when they gave up). `auto` entries are the opponent's moves
 * auto-filled in auto-opponent mode — the user never tried them, so they are
 * not counted. A move resolved `correct` counts as `nailed` if it had no
 * preceding wrong attempt, otherwise `struggled`.
 */
export function computeRecallStats(entries: MoveLogEntry[]): RecallStats {
  let nailed = 0;
  let struggled = 0;
  let missed = 0;
  let mistakes = 0;
  // Wrong attempts accumulated for the move currently being resolved.
  let mistakesForCurrent = 0;

  for (const entry of entries) {
    switch (entry.status) {
      case 'incorrect':
        mistakes++;
        mistakesForCurrent++;
        break;
      case 'correct':
        if (mistakesForCurrent > 0) struggled++;
        else nailed++;
        mistakesForCurrent = 0;
        break;
      case 'skipped':
        missed++;
        mistakesForCurrent = 0;
        break;
      case 'auto':
        // Opponent's auto-filled move — not the user's responsibility.
        mistakesForCurrent = 0;
        break;
    }
  }

  const recalled = nailed + struggled;
  const total = recalled + missed;
  return {
    total,
    nailed,
    struggled,
    missed,
    mistakes,
    recalled,
    recallRate: total > 0 ? recalled / total : 0,
  };
}
