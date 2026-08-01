import { PgnParseError, parsePgnTree } from '@blindfold-chess/features/chess-core';

/**
 * Why a pasted PGN cannot be turned into a kata, in the vocabulary the forms
 * display. The parser distinguishes more cases (`empty`, `noMoves`, `badFen`,
 * `danglingVariation`), but only one of them is worth a sentence of its own:
 * an author who typed a move the position doesn't allow needs to know *which*
 * move, and everything else is the same "this isn't readable notation" advice.
 */
export type PgnFormError =
  { kind: 'illegalMove'; san: string; moveNumber: number; ply: number } | { kind: 'unreadable' };

/**
 * Check a PGN the way the repertoire pipeline will, and report what stopped it.
 *
 * Blank input returns `null`: an empty textbox is a form not yet filled in, not
 * a mistake to shout about — the required-field check owns that on submit.
 *
 * Runs the same `parsePgnTree` the server validator and the board builder use,
 * so what the form says before submitting is what the server would say after.
 * Client-safe (chess.js already reaches these forms through the board builder).
 */
export function findPgnFormError(pgn: string): PgnFormError | null {
  if (!pgn.trim()) return null;

  try {
    parsePgnTree(pgn);
    return null;
  } catch (error) {
    if (error instanceof PgnParseError && error.failure.reason === 'illegalMove') {
      const { san, moveNumber, ply } = error.failure;
      return { kind: 'illegalMove', san, moveNumber, ply };
    }
    return { kind: 'unreadable' };
  }
}
