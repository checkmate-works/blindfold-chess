/**
 * Lightweight publish limits, split out from `publish-game.ts` so client
 * components (the publish form's `maxLength` attributes) can import the bounds
 * without pulling the chess-core validation graph (chess.js) into the browser
 * bundle.
 */
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 2000;
/** A real game never approaches this; the cap bounds abusive payloads. */
export const MAX_MOVES = 600;

/**
 * Whether an already-trimmed title may be saved: non-empty and within
 * {@link MAX_TITLE_LENGTH}. The publish and edit forms disable their submit
 * button on this, and the publish and edit actions reject on its negation, so
 * the four can never disagree about a title that is exactly at the limit.
 */
export function isValidGameTitle(trimmedTitle: string): boolean {
  return trimmedTitle.length > 0 && trimmedTitle.length <= MAX_TITLE_LENGTH;
}
