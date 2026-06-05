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
export const AI_REPLY_DURATION_VALUES = [0, 5000, 10000] as const;
export type AiReplyDuration = (typeof AI_REPLY_DURATION_VALUES)[number];

/** Sentinel value meaning "never auto-dismiss the AI move". */
export const AI_REPLY_DURATION_KEEP = 0;

/**
 * Order the values sit on the settings slider: shortest → longest, with the
 * "keep visible" sentinel placed at the far (right) end so it reads as the
 * longest possible duration (∞). Dragging right always means "stays longer",
 * which is why a slider works despite one stop being "forever" rather than a
 * number. Holds exactly the same set as {@link AI_REPLY_DURATION_VALUES}.
 */
export const AI_REPLY_DURATION_SLIDER_ORDER = [
  5000,
  10000,
  AI_REPLY_DURATION_KEEP,
] as const satisfies readonly AiReplyDuration[];

/** Default — a 5-second auto-dismiss window. */
export const DEFAULT_AI_REPLY_DURATION: AiReplyDuration = 5000;

/** Type guard for runtime validators reading data from localStorage. */
export function isAiReplyDuration(value: unknown): value is AiReplyDuration {
  return (
    typeof value === 'number' && (AI_REPLY_DURATION_VALUES as readonly number[]).includes(value)
  );
}

/**
 * Resolve the i18n key + params under `Preferences.game` for displaying a
 * duration value. Shared by the settings picker, the change-log formatter, and
 * the operation-log so the wording ("Keep visible" / "{n}s") stays in lockstep.
 * `0` (keep) takes a param-less key; finite values pass seconds.
 */
export function aiReplyDurationLabel(value: number): { key: string; params?: { seconds: number } } {
  return value === AI_REPLY_DURATION_KEEP
    ? { key: 'aiReplyDurationModes.keep' }
    : { key: 'aiReplyDurationModes.seconds', params: { seconds: value / 1000 } };
}
