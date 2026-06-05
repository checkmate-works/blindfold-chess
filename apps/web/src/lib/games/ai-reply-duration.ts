/**
 * How long the on-board AI-reply chip keeps the opponent's last move visible
 * after the AI replies, in milliseconds.
 *
 * `0` is the sentinel for "keep it visible indefinitely" — the move stays until
 * the AI's next reply re-triggers the chip, which in practice means it sits
 * there through the player's whole turn. This mirrors the historical behavior
 * where the AI move was shown in the page title until the player responded.
 *
 * Only meaningful in blindfold modes (`boardVisibility !== 'always'`); in
 * 'always' mode the move is read straight off the board and the chip is
 * suppressed, so this setting has no effect there.
 */
export const AI_REPLY_DURATION_VALUES = [0, 2000, 4000, 8000] as const;
export type AiReplyDuration = (typeof AI_REPLY_DURATION_VALUES)[number];

/** Sentinel value meaning "never auto-dismiss the AI move". */
export const AI_REPLY_DURATION_KEEP = 0;

/** Default — the historical 4-second auto-dismiss window. */
export const DEFAULT_AI_REPLY_DURATION: AiReplyDuration = 4000;

/** Type guard for runtime validators reading data from localStorage. */
export function isAiReplyDuration(value: unknown): value is AiReplyDuration {
  return (
    typeof value === 'number' && (AI_REPLY_DURATION_VALUES as readonly number[]).includes(value)
  );
}
