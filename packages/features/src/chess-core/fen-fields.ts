/**
 * Reading and assembling the individual fields of a FEN for a position set-up
 * form: splitting a pasted FEN into its parts, offering only the castling
 * rights and en-passant targets the placement supports, and joining the parts
 * back into a full FEN.
 *
 * Pure (no chess.js), so it can be imported from the light
 * `@blindfold-chess/features/chess-core/fen-fields` path by both the web
 * new-game forms and the mobile AI-game setup screen.
 */
import { FILES } from "@blindfold-chess/types";
import type { PieceColor } from "@blindfold-chess/types";

import {
  CASTLING_RIGHTS,
  type CastlingRight,
  castlingRightSatisfied,
  fenToBoardFlat,
} from "./fen-pure";

/** Which of the four castling rights are set, keyed as a FEN spells them. */
export type CastlingRights = Record<CastlingRight, boolean>;

/** No castling right set. */
export const NO_CASTLING_RIGHTS: CastlingRights = {
  K: false,
  Q: false,
  k: false,
  q: false,
};

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
 * The FENs read here are not produced by this app's own serializer: they come
 * from a URL parameter users copy, edit and paste, from the `[FEN "..."]`
 * header of a pasted PGN, or from a text field. Those routinely carry
 * leading/trailing whitespace or doubled spaces between fields. A bare
 * `split(' ')` turns a doubled space into an empty field, so every later field
 * shifts by one and, for example, the castling rights get read as the side to
 * move. Whitespace is therefore normalized before splitting, and every reader
 * goes through this one function instead of restating the split.
 *
 * This deliberately does not validate the position: placement, castling and
 * en-passant are passed through as strings for the callers' own validation.
 * Only the side to move is narrowed, because the forms act on it directly.
 *
 * @returns `null` when nothing is left after normalization (empty or
 *   whitespace-only input); otherwise the fields that are present.
 */
export function parseFenFields(fen: string): FenFields | null {
  const trimmed = fen.trim();
  if (trimmed === "") return null;

  const [placement, side, castling, enPassant] = trimmed.split(/\s+/);

  return {
    placement,
    sideToMove: side === "w" || side === "b" ? side : null,
    ...(castling !== undefined && { castling }),
    ...(enPassant !== undefined && { enPassant }),
  };
}

/**
 * Reads a FEN castling field (`KQkq`, `Kq`, `-`, …) into a record. Letters
 * other than the four rights are ignored, so a malformed field degrades to
 * "fewer rights" rather than an error; semantic validation of the assembled
 * FEN is the caller's job.
 */
export function parseCastlingField(field: string): CastlingRights {
  return {
    K: field.includes("K"),
    Q: field.includes("Q"),
    k: field.includes("k"),
    q: field.includes("q"),
  };
}

/**
 * Joins the parts a position editor holds separately into a full FEN. Only the
 * placement field of `boardFen` is used, so a full FEN may be passed. The
 * clocks are reset (`0 1`): a set-up position has no history to count from.
 */
export function buildFenFromParts(
  boardFen: string,
  turn: PieceColor,
  castling: CastlingRights,
  enPassant: string,
): string {
  const boardPart = boardFen.split(" ")[0];
  let castlingStr = "";
  if (castling.K) castlingStr += "K";
  if (castling.Q) castlingStr += "Q";
  if (castling.k) castlingStr += "k";
  if (castling.q) castlingStr += "q";
  if (!castlingStr) castlingStr = "-";
  return `${boardPart} ${turn} ${castlingStr} ${enPassant} 0 1`;
}

/**
 * Given a board FEN (piece placement only), returns which castling rights
 * are possible based on whether the king and rook are on their initial squares.
 *
 * Which squares those are is the same fact semantic FEN validation enforces on
 * a stored position, so it is read from the shared table rather than restated
 * here as flat-board indices.
 */
export function getCastlingAvailability(boardFen: string): CastlingRights {
  const board = fenToBoardFlat(boardFen);

  return {
    K: castlingRightSatisfied(board, "K"),
    Q: castlingRightSatisfied(board, "Q"),
    k: castlingRightSatisfied(board, "k"),
    q: castlingRightSatisfied(board, "q"),
  };
}

/**
 * Given a board FEN (piece placement only) and the side to move,
 * returns which en passant target squares are valid based on pawn positions.
 *
 * For white's turn (en passant targets on rank 6):
 *   file X is available only when a black pawn ('p') exists on X5 (rank 5).
 * For black's turn (en passant targets on rank 3):
 *   file X is available only when a white pawn ('P') exists on X4 (rank 4).
 */
export function getEnPassantAvailability(
  boardFen: string,
  turn: PieceColor,
): Record<string, boolean> {
  const board = fenToBoardFlat(boardFen);

  // Flat board indices:
  // rank 8: 0..7, rank 7: 8..15, rank 6: 16..23, rank 5: 24..31,
  // rank 4: 32..39, rank 3: 40..47, rank 2: 48..55, rank 1: 56..63
  //
  // For white's turn, check rank 5 (indices 24..31)
  // For black's turn, check rank 4 (indices 32..39)
  const rankOffset = turn === "w" ? 24 : 32;
  const expectedPawn = turn === "w" ? "p" : "P";

  const result: Record<string, boolean> = {};
  for (let i = 0; i < FILES.length; i++) {
    result[FILES[i]] = board[rankOffset + i] === expectedPawn;
  }
  return result;
}

/**
 * Drops the castling rights and en-passant target that the placement cannot
 * support with `turn` to move, so a FEN pasted with stale rights (a king that
 * has left e1 but still claims `KQ`) still yields a playable position instead
 * of being rejected outright. This is the same clamping a board editor applies
 * as the user moves pieces, expressed once for callers that receive the parts
 * all at once.
 */
export function clampFenParts(
  placement: string,
  turn: PieceColor,
  castling: CastlingRights,
  enPassant: string,
): { castling: CastlingRights; enPassant: string } {
  const castlingAvailability = getCastlingAvailability(placement);
  const clamped = { ...castling };
  for (const right of CASTLING_RIGHTS) {
    if (clamped[right] && !castlingAvailability[right]) clamped[right] = false;
  }

  const enPassantAvailability = getEnPassantAvailability(placement, turn);
  const expectedRank = turn === "w" ? "6" : "3";
  const enPassantValid =
    enPassant.length === 2 &&
    enPassant[1] === expectedRank &&
    enPassantAvailability[enPassant[0]] === true;

  return { castling: clamped, enPassant: enPassantValid ? enPassant : "-" };
}
