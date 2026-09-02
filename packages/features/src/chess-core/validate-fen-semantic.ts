/**
 * Semantic FEN validation: enforces legal-chess invariants on top of structural
 * validity. Use this when storing user-supplied FENs that must represent a
 * plausibly-real position (`post_fen_attachments`) — the chunks catalog still
 * uses `validateFenStructure` directly, because patterns there may legally
 * describe arbitrary piece subsets with no kings.
 *
 * Layers:
 *   1. `validateFenStructure` — six-field shape, rank sums, character classes.
 *      Pure, chess.js-free, lives in `./validate-fen-structure`.
 *   2. `validateFenSemantic` (this file) — piece counts, pawn placement,
 *      castling rights consistency, en passant target consistency. Backed by
 *      `chess.js` for the legality cross-check, plus our own pre-checks for
 *      cases chess.js is permissive about.
 *
 * Why a separate function from `validateFen` (the chess.js boolean wrapper):
 *   - `validateFen` returns a single bool with no diagnostic.
 *   - `chess.js` accepts a few nominally-illegal positions (e.g. it does not
 *     always reject castling rights when the rook is missing from its origin
 *     square) — the pre-checks here close those gaps.
 *   - Callers (Server Actions) need a structured `{ ok, error }` shape so they
 *     can map the failure to a specific i18n key.
 *
 * @design chess.js isolation
 *
 * This module is allowed to import `chess.js` because it lives inside
 * `chess-core/`. Apps must consume it via the chess-core barrel export, not
 * by importing from `chess.js` directly.
 */

import { Chess } from "chess.js";

import type { CastlingRight } from "./fen-pure";
import {
  CASTLING_RIGHTS,
  castlingRightSatisfied,
  fenToBoardFlat,
  squareToBoardIndex,
} from "./fen-pure";
import { validateFenStructure } from "./validate-fen-structure";

export type FenSemanticReason =
  | "structure"
  | "kings"
  | "pawn_placement"
  | "piece_count"
  | "castling_rights"
  | "en_passant"
  | "illegal_position";

/**
 * Discriminated union: when `ok` is `false`, both `reason` and `error` are
 * always present. Every `ok: false` return path inside `validateFenSemantic`
 * populates both fields, so callers can narrow on `ok` and access the
 * failure context without an extra `undefined` guard.
 */
export type FenSemanticResult =
  { ok: true } | { ok: false; reason: FenSemanticReason; error: string };

/**
 * Validate a FEN string for semantic legality on top of structural validity.
 *
 * Rejects:
 * - any structural failure (delegated to `validateFenStructure`)
 * - missing or duplicated kings (must be exactly one of each color)
 * - pawns on rank 1 or 8 (illegal — pawns on those ranks must have promoted)
 * - more than 8 pawns or more than 16 total pieces per side
 * - castling rights without the implied rook + king on starting squares:
 *     - "K" requires white king on e1 and white rook on h1
 *     - "Q" requires white king on e1 and white rook on a1
 *     - "k" requires black king on e8 and black rook on h8
 *     - "q" requires black king on e8 and black rook on a8
 * - en passant target square without the matching pawn behind it:
 *     - if side-to-move is "w", ep square must be on rank 6 with a black pawn on rank 5
 *     - if side-to-move is "b", ep square must be on rank 3 with a white pawn on rank 4
 * - any other position chess.js rejects (catch-all for two-king-in-check, etc.)
 *
 * @example
 * validateFenSemantic("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
 * // => { ok: true }
 *
 * @example
 * validateFenSemantic("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e3 0 1")
 * // => { ok: false, reason: "en_passant", error: "..." }
 * // (en passant rank for white-to-move must be 6, not 3)
 */
/** A semantic-check failure. `null` from a check means "this rule passed". */
type FenSemanticFailure = {
  ok: false;
  reason: FenSemanticReason;
  error: string;
};

/**
 * Flat 64-square board as produced by {@link fenToBoardFlat}: index 0 = a8,
 * 63 = h1, empty squares are `""`.
 */
type Board = readonly string[];

/** Per-side piece tallies, computed in a single board pass. */
type BoardTally = {
  whiteKings: number;
  blackKings: number;
  whitePawns: number;
  blackPawns: number;
  whitePieces: number;
  blackPieces: number;
};

function tallyBoard(board: Board): BoardTally {
  const tally: BoardTally = {
    whiteKings: 0,
    blackKings: 0,
    whitePawns: 0,
    blackPawns: 0,
    whitePieces: 0,
    blackPieces: 0,
  };
  for (const piece of board) {
    if (piece === "") continue;
    if (piece === piece.toUpperCase()) tally.whitePieces += 1;
    else tally.blackPieces += 1;
    if (piece === "K") tally.whiteKings += 1;
    else if (piece === "k") tally.blackKings += 1;
    else if (piece === "P") tally.whitePawns += 1;
    else if (piece === "p") tally.blackPawns += 1;
  }
  return tally;
}

/** Each side must have exactly one king. */
function checkKingCount(tally: BoardTally): FenSemanticFailure | null {
  if (tally.whiteKings !== 1 || tally.blackKings !== 1) {
    return {
      ok: false,
      reason: "kings",
      error: "Each side must have exactly one king",
    };
  }
  return null;
}

/** Ranks 8 (top) and 1 (bottom) must not contain pawns. */
function checkPawnPlacement(board: Board): FenSemanticFailure | null {
  for (let i = 0; i < 8; i += 1) {
    const top = board[i];
    if (top === "P" || top === "p") {
      return {
        ok: false,
        reason: "pawn_placement",
        error: "Pawns may not be on rank 8",
      };
    }
    const bottom = board[56 + i];
    if (bottom === "P" || bottom === "p") {
      return {
        ok: false,
        reason: "pawn_placement",
        error: "Pawns may not be on rank 1",
      };
    }
  }
  return null;
}

/** At most 8 pawns and 16 total pieces per side. */
function checkPieceCounts(tally: BoardTally): FenSemanticFailure | null {
  if (tally.whitePawns > 8 || tally.blackPawns > 8) {
    return {
      ok: false,
      reason: "piece_count",
      error: "A side may not have more than 8 pawns",
    };
  }
  // Total pieces per side capped at 16 (1 king + up to 8 pawns + up to 7 promoted /
  // original officers). This is a generous upper bound — strictly the unpromoted
  // limit is 8 pawns + 8 officers = 16, but with promotions the original quota
  // can shift between officer types. The hard cap stays at 16 pieces per side.
  if (tally.whitePieces > 16 || tally.blackPieces > 16) {
    return {
      ok: false,
      reason: "piece_count",
      error: "A side may not have more than 16 pieces",
    };
  }
  return null;
}

/**
 * What to tell the caller when a declared right is not backed by the placement.
 * Spelled out per right rather than assembled from
 * {@link CASTLING_REQUIREMENTS} so the message reads as prose ("kingside", not
 * "h-side") — the squares themselves come from the shared table.
 */
const CASTLING_RIGHT_ERRORS: Readonly<Record<CastlingRight, string>> = {
  K: "White kingside castling right requires K on e1 and R on h1",
  Q: "White queenside castling right requires K on e1 and R on a1",
  k: "Black kingside castling right requires k on e8 and r on h8",
  q: "Black queenside castling right requires k on e8 and r on a8",
};

/** Every declared castling right must have its king + rook on home squares. */
function checkCastlingRights(
  board: Board,
  castling: string,
): FenSemanticFailure | null {
  if (castling === "-") return null;
  // We already know castling matches /^[KQkq]+$/ from validateFenStructure.
  for (const right of CASTLING_RIGHTS) {
    if (!castling.includes(right)) continue;
    if (!castlingRightSatisfied(board, right)) {
      return {
        ok: false,
        reason: "castling_rights",
        error: CASTLING_RIGHT_ERRORS[right],
      };
    }
  }
  return null;
}

/**
 * An en passant target must name an empty square on the correct rank, with the
 * pawn that just double-pushed sitting directly behind it.
 *
 * FEN semantics: if side-to-move is `w`, black moved last, so the ep target is
 * on rank 6 (the square the black pawn skipped over) and a black pawn sits on
 * rank 5. If side-to-move is `b`, ep target is on rank 3 and a white pawn sits
 * on rank 4.
 */
function checkEnPassant(
  board: Board,
  sideToMove: string,
  enPassant: string,
): FenSemanticFailure | null {
  if (enPassant === "-") return null;

  const epRank = enPassant[1];
  const expectedRank = sideToMove === "w" ? "6" : "3";
  if (epRank !== expectedRank) {
    return {
      ok: false,
      reason: "en_passant",
      error: `En passant target rank must be ${expectedRank} when side to move is ${sideToMove}`,
    };
  }
  // Locate the pawn that just double-pushed.
  const pawnRank = sideToMove === "w" ? "5" : "4";
  const pawnSquare = enPassant[0] + pawnRank;
  const pawnIdx = squareToBoardIndex(pawnSquare);
  if (pawnIdx === null) {
    return {
      ok: false,
      reason: "en_passant",
      error: "En passant square is malformed",
    };
  }
  const expectedPawn = sideToMove === "w" ? "p" : "P";
  if (board[pawnIdx] !== expectedPawn) {
    return {
      ok: false,
      reason: "en_passant",
      error: "En passant target has no pawn behind it",
    };
  }
  // The ep target square itself must be empty.
  const targetIdx = squareToBoardIndex(enPassant);
  if (targetIdx === null || board[targetIdx] !== "") {
    return {
      ok: false,
      reason: "en_passant",
      error: "En passant target square must be empty",
    };
  }
  return null;
}

export function validateFenSemantic(fen: string): FenSemanticResult {
  const structural = validateFenStructure(fen);
  if (!structural.ok) {
    // `FenStructureResult.error` is typed optional, but every `ok: false`
    // branch in `validateFenStructure` populates it. Coalesce defensively
    // to satisfy the discriminated-union contract here.
    return {
      ok: false,
      reason: "structure",
      error: structural.error ?? "FEN structure is invalid",
    };
  }

  const trimmed = fen.trim();
  const [placement, sideToMove, castling, enPassant] = trimmed.split(/\s+/);
  const board = fenToBoardFlat(placement);
  const tally = tallyBoard(board);

  // Run each rule in order; the first failure wins. Ordering is observable
  // through `reason`, so it matches the original sequential checks.
  const failure =
    checkKingCount(tally) ??
    checkPawnPlacement(board) ??
    checkPieceCounts(tally) ??
    checkCastlingRights(board, castling) ??
    checkEnPassant(board, sideToMove, enPassant);
  if (failure) return failure;

  // Final catch-all: positions that pass everything above but that chess.js
  // still rejects (e.g. side-not-to-move is in check, two-king-in-check,
  // certain bishop / promotion impossibilities). chess.js is permissive in
  // a few corners of FEN, but it does reject the well-known illegal cases.
  try {
    new Chess(trimmed);
  } catch (e) {
    return {
      ok: false,
      reason: "illegal_position",
      error: e instanceof Error ? e.message : "Illegal position",
    };
  }

  return { ok: true };
}
