/**
 * Structural FEN validation that intentionally does NOT enforce legal-chess
 * invariants (two kings, no pawns on rank 1/8, and so on).
 *
 * Use this for domains where a FEN is a *pattern* — e.g. the `chunks`
 * catalog, which stores piece-coordination patterns like "a kingside
 * fianchetto" or "a rook battery" that may describe only a handful of
 * pieces with no kings present. For full legal-position validation use
 * `validateFen` from `./fen-chess` (chess.js-backed).
 *
 * This module is chess.js-free on purpose and lives alongside
 * `fen-pure.ts`: the whole point is to accept structurally-valid boards
 * that chess.js would reject. It is therefore NOT re-exported from
 * `./fen.ts` (which is the chess.js-dependent barrel); it is exported
 * directly from `./index.ts`.
 */

import {
  findPiecePlacementError,
  type PiecePlacementError,
} from "./piece-placement";

export type FenStructureResult = { ok: true } | { ok: false; error: string };

const CASTLING_RE = /^[KQkq]+$/;
// Ranks 3 and 6 only: a double-pushed pawn can only skip a square on one of
// those, so any other rank cannot occur in a FEN. Matches chess.js's own
// FEN check and the `post_fen_attachments` DB CHECK (`[a-h][36]`).
const EN_PASSANT_RE = /^[a-h][36]$/;
const NON_NEGATIVE_INT = /^\d+$/;

/**
 * Validate the *structure* of a FEN string. Returns `{ ok: true }` when the
 * six space-separated fields are individually well-formed:
 *
 * 1. Piece placement: 8 ranks separated by `/`, each summing to 8 squares,
 *    containing only `PNBRQKpnbrqk` and digit run-length shorthands, one
 *    digit per run of empty squares (the rule `validateFenFormat` shares).
 * 2. Side to move: exactly `w` or `b`.
 * 3. Castling rights: `-` or a subset of `KQkq` (order not enforced).
 * 4. En passant square: `-` or a rank-3 / rank-6 square name (`a3`-`h3`,
 *    `a6`-`h6`). Whether the rank matches the side to move is a semantic
 *    check left to `validateFenSemantic`.
 * 5. Halfmove clock: a non-negative integer.
 * 6. Fullmove number: a positive integer (>= 1).
 *
 * Explicitly accepted (and explicitly NOT checked):
 * - Boards with zero, one, or many kings.
 * - Boards with pawns on rank 1 or 8.
 * - Boards whose side-to-move is in check or has impossible castling rights.
 *
 * These are legal-chess invariants, not structural invariants, and are the
 * caller's responsibility to enforce (or intentionally ignore).
 */
export function validateFenStructure(fen: string): FenStructureResult {
  if (!fen || typeof fen !== "string") {
    return { ok: false, error: "FEN is empty" };
  }

  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) {
    return { ok: false, error: "FEN must have 6 space-separated fields" };
  }

  const [placement, sideToMove, castling, enPassant, halfmove, fullmove] =
    fields;

  // 1. Piece placement
  const placementError = findPiecePlacementError(placement);
  if (placementError) {
    return { ok: false, error: describePlacementError(placementError) };
  }

  // 2. Side to move
  if (sideToMove !== "w" && sideToMove !== "b") {
    return { ok: false, error: "Side to move must be w or b" };
  }

  // 3. Castling rights
  if (castling !== "-" && !CASTLING_RE.test(castling)) {
    return { ok: false, error: "Castling rights are malformed" };
  }

  // 4. En passant
  if (enPassant !== "-" && !EN_PASSANT_RE.test(enPassant)) {
    return { ok: false, error: "En passant square is malformed" };
  }

  // 5. Halfmove clock
  if (!NON_NEGATIVE_INT.test(halfmove)) {
    return {
      ok: false,
      error: "Halfmove clock must be a non-negative integer",
    };
  }

  // 6. Fullmove number (must be >= 1)
  if (!NON_NEGATIVE_INT.test(fullmove) || parseInt(fullmove, 10) < 1) {
    return { ok: false, error: "Fullmove number must be a positive integer" };
  }

  return { ok: true };
}

function describePlacementError(error: PiecePlacementError): string {
  switch (error.kind) {
    case "rankCount":
      return "Board must have exactly 8 ranks";
    case "invalidCharacters":
      return `Rank ${error.rank} contains invalid characters`;
    case "consecutiveDigits":
      return `Rank ${error.rank} has consecutive empty-square digits`;
    case "squareCount":
      return `Rank ${error.rank} does not sum to 8 squares`;
  }
}
