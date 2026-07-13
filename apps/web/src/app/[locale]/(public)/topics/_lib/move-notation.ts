import type { Side } from '@blindfold-chess/types';

/**
 * The move sequence a thread (or an owner's note) is written against, when it
 * hangs off a whole line of play rather than a single position. Enables
 * PGN-style numbered references — "1... e4", "3. Nf3 Nc6" — in a body: the
 * parser resolves the numbers against these moves and renders each reference as
 * a board-preview link.
 *
 * Its own module rather than the comment-tree context, because the repertoire
 * line's annotation panel needs the same shape without needing the thread.
 */
export type MoveNotationLine = {
  /** SAN moves of the line, in order. A reference branches off these. */
  moves: string[];
  /** The line's root position; null = the standard start. */
  startingFen: string | null;
  /** Orientation for the preview board. */
  playerColor: Side;
};
