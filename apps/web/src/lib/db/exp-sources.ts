/**
 * The `exp_events.source` values that have a counterpart cancelling them.
 *
 * A leaf module, so the code that writes these rows (`save-exp.ts`) and the
 * code that only reads them (`get-exp-info-by-source.ts`) share the names
 * without the reader importing the write path.
 */

/** `exp_events.source` of the grant for a recorded challenge result. */
export const CHALLENGE_RESULT_SOURCE = 'challenge_result';

/**
 * `exp_events.source` of the row that cancels a {@link CHALLENGE_RESULT_SOURCE}
 * grant. A source of its own (rather than a second `challenge_result` row) is
 * what lets the `(source, source_id)` unique index hold one grant and one
 * reversal per result.
 */
export const CHALLENGE_RESULT_REVERSAL_SOURCE = 'challenge_result_reversal';

/**
 * The source whose rows cancel grants of `source`, or `null` when grants of
 * that source are never taken back. Lets a reader of a grant find out whether
 * it still stands without knowing the source names.
 */
export function reversalSourceOf(source: string): string | null {
  return source === CHALLENGE_RESULT_SOURCE ? CHALLENGE_RESULT_REVERSAL_SOURCE : null;
}
