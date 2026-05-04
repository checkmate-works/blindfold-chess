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
  | { ok: true }
  | { ok: false; reason: FenSemanticReason; error: string };

const FILE_INDEX: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
};

/**
 * Expand a FEN piece-placement field into a flat 64-element array of single
 * piece characters (or `null` for empty squares). Index 0 = a8, 63 = h1.
 *
 * Assumes `validateFenStructure` has already vetted the placement string;
 * this helper does not re-check rank sums.
 */
function expandPlacement(placement: string): (string | null)[] {
  const board: (string | null)[] = new Array(64).fill(null);
  let i = 0;
  for (const ch of placement) {
    if (ch === "/") continue;
    if (ch >= "1" && ch <= "8") {
      i += parseInt(ch, 10);
    } else {
      board[i] = ch;
      i += 1;
    }
  }
  return board;
}

/**
 * Convert algebraic square name (e.g. "e4") to a flat index where 0 = a8 and
 * 63 = h1. Returns `null` for malformed input.
 */
function squareToIndex(square: string): number | null {
  if (square.length !== 2) return null;
  const fileIdx = FILE_INDEX[square[0]];
  const rankNum = parseInt(square[1], 10);
  if (
    fileIdx === undefined ||
    Number.isNaN(rankNum) ||
    rankNum < 1 ||
    rankNum > 8
  ) {
    return null;
  }
  // rank 8 → row 0, rank 1 → row 7
  const rowIdx = 8 - rankNum;
  return rowIdx * 8 + fileIdx;
}

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
  const fields = trimmed.split(/\s+/);
  const [placement, sideToMove, castling, enPassant] = fields;

  const board = expandPlacement(placement);

  // ─── King counts ───────────────────────────────────────────────────────
  let whiteKings = 0;
  let blackKings = 0;
  let whitePawns = 0;
  let blackPawns = 0;
  let whitePieces = 0;
  let blackPieces = 0;
  for (const piece of board) {
    if (piece === null) continue;
    if (piece === piece.toUpperCase()) whitePieces += 1;
    else blackPieces += 1;
    if (piece === "K") whiteKings += 1;
    else if (piece === "k") blackKings += 1;
    else if (piece === "P") whitePawns += 1;
    else if (piece === "p") blackPawns += 1;
  }

  if (whiteKings !== 1 || blackKings !== 1) {
    return {
      ok: false,
      reason: "kings",
      error: "Each side must have exactly one king",
    };
  }

  // ─── Pawn placement on first/last rank ────────────────────────────────
  // Ranks 8 (top) and 1 (bottom) must not contain pawns.
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

  // ─── Pawn / piece counts per side ─────────────────────────────────────
  if (whitePawns > 8 || blackPawns > 8) {
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
  if (whitePieces > 16 || blackPieces > 16) {
    return {
      ok: false,
      reason: "piece_count",
      error: "A side may not have more than 16 pieces",
    };
  }

  // ─── Castling rights consistency ──────────────────────────────────────
  if (castling !== "-") {
    // We already know castling matches /^[KQkq]+$/ from validateFenStructure.
    const e1 = squareToIndex("e1");
    const e8 = squareToIndex("e8");
    const h1 = squareToIndex("h1");
    const a1 = squareToIndex("a1");
    const h8 = squareToIndex("h8");
    const a8 = squareToIndex("a8");
    // Index lookups above are statically valid (constant inputs); the casts
    // below are safe.
    if (castling.includes("K") && (board[e1!] !== "K" || board[h1!] !== "R")) {
      return {
        ok: false,
        reason: "castling_rights",
        error: "White kingside castling right requires K on e1 and R on h1",
      };
    }
    if (castling.includes("Q") && (board[e1!] !== "K" || board[a1!] !== "R")) {
      return {
        ok: false,
        reason: "castling_rights",
        error: "White queenside castling right requires K on e1 and R on a1",
      };
    }
    if (castling.includes("k") && (board[e8!] !== "k" || board[h8!] !== "r")) {
      return {
        ok: false,
        reason: "castling_rights",
        error: "Black kingside castling right requires k on e8 and r on h8",
      };
    }
    if (castling.includes("q") && (board[e8!] !== "k" || board[a8!] !== "r")) {
      return {
        ok: false,
        reason: "castling_rights",
        error: "Black queenside castling right requires k on e8 and r on a8",
      };
    }
  }

  // ─── En passant target square consistency ─────────────────────────────
  if (enPassant !== "-") {
    // Structurally valid en passant is a-h + 1-8. Semantically, the rank
    // must be 6 (white just moved) when side-to-move is black… wait — FEN
    // semantics: if side-to-move is `w`, then black moved last, so the ep
    // target is on rank 6 (the square the black pawn skipped over), and a
    // black pawn must sit on rank 5 directly south of the ep target.
    // Conversely if side-to-move is `b`, ep target is on rank 3, and a
    // white pawn must sit on rank 4.
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
    const pawnIdx = squareToIndex(pawnSquare);
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
    const targetIdx = squareToIndex(enPassant);
    if (targetIdx === null || board[targetIdx] !== null) {
      return {
        ok: false,
        reason: "en_passant",
        error: "En passant target square must be empty",
      };
    }
  }

  // ─── chess.js cross-check ─────────────────────────────────────────────
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
