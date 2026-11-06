import {
  AI_REPLY_DURATION_KEEP,
  type AiReplyDuration,
} from '@blindfold-chess/features/game-preferences';

/**
 * The value set, sentinel, default and type guard of the AI-reply duration
 * preference live in `@blindfold-chess/features/game-preferences`, where their
 * semantics are documented, so the mobile app reads stored preferences with
 * the same rules. Re-exported here so web imports stay put; the slider order
 * and the label resolver below are web UI concerns and stay in this module.
 */
export {
  AI_REPLY_DURATION_KEEP,
  AI_REPLY_DURATION_VALUES,
  type AiReplyDuration,
  DEFAULT_AI_REPLY_DURATION,
  isAiReplyDuration,
} from '@blindfold-chess/features/game-preferences';

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
