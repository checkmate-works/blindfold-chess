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
