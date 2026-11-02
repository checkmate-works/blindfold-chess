/**
 * Splitting a FEN string that arrived from outside the app into the fields the
 * new-game forms read.
 *
 * The FENs read here are not produced by this app's own serializer: one comes
 * from the `fen` URL parameter, which users copy, edit and paste, and the
 * other from the `[FEN "..."]` header of a PGN the user pasted. Both routinely
 * carry leading/trailing whitespace or doubled spaces between fields. A bare
 * `split(' ')` turns a doubled space into an empty field, so every later field
 * shifts by one and, for example, the castling rights get read as the side to
 * move. Whitespace is therefore normalized before splitting, and both forms go
 * through this one function instead of each restating the split, so that the
 * next reader of a FEN field does not reintroduce the bare `split(' ')`.
 *
 * This deliberately does not validate the position: placement, castling and
 * en-passant are passed through as strings for the forms' own validation. Only
 * the side to move is narrowed, because the forms act on it directly.
 */
import type { PieceColor } from '@blindfold-chess/types';

export type FenFields = {
  /** The piece-placement field (first field), unvalidated. */
  placement: string;
  /**
   * The side-to-move field when it is exactly `w` or `b`; `null` when the
   * field is missing or holds anything else, so callers can leave their
   * current colour untouched instead of guessing.
   */
  sideToMove: PieceColor | null;
  /** The castling field as written (may be `-`), or absent when the FEN stops earlier. */
  castling?: string;
  /** The en-passant field as written (may be `-`), or absent when the FEN stops earlier. */
  enPassant?: string;
};

/**
 * Splits `fen` into its leading fields after collapsing any run of whitespace
 * and trimming both ends.
 *
 * @returns `null` when nothing is left after normalization (empty or
 *   whitespace-only input); otherwise the fields that are present.
 */
export function parseFenFields(fen: string): FenFields | null {
  const trimmed = fen.trim();
  if (trimmed === '') return null;

  const [placement, side, castling, enPassant] = trimmed.split(/\s+/);

  return {
    placement,
    sideToMove: side === 'w' || side === 'b' ? side : null,
    ...(castling !== undefined && { castling }),
    ...(enPassant !== undefined && { enPassant }),
  };
}
