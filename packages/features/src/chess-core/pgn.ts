import type { AlgebraicNotation } from "@blindfold-chess/types";
import { Chess, DEFAULT_POSITION } from "chess.js";

import { getTurnFromFen, validateFen } from "./fen";
import { validateMoveSequence } from "./moves";
import type { MoveResult } from "./types";
import { toMoveResult } from "./types";

// Re-export pure formatting types and functions from pgn-format
export type {
  FormattedPgnMove,
  FormattedPgn,
  ParsedPgnMove,
} from "./pgn-format";
export {
  formatPgnToText,
  getPgnSuggestion,
  parsePgnMoves,
  flattenPgnMoves,
} from "./pgn-format";

import { parsePgnMoves, flattenPgnMoves } from "./pgn-format";

/**
 * Result of parsing and validating a move sequence against a position.
 */
export type ParsedMoveSequence = {
  fen: string;
  moves: AlgebraicNotation[];
  playerColor: "w" | "b";
};

// ── chess.js-dependent operations ────────────────────────────

export function validatePgn(pgn: string): boolean {
  if (!pgn.trim()) return false;

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return true;
  } catch {
    return false;
  }
}

export function parsePgn(pgn: string): string[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history();
  } catch {
    throw new Error("Invalid PGN format");
  }
}

export function parsePgnWithFen(pgn: string): {
  moves: string[];
  startingFen?: string;
} {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);

    const headers = chess.getHeaders();
    const startingFen = headers.FEN;
    const isCustomPosition = startingFen && startingFen !== DEFAULT_POSITION;

    return {
      moves: chess.history(),
      startingFen: isCustomPosition ? startingFen : undefined,
    };
  } catch {
    throw new Error("Invalid PGN format");
  }
}

export function generatePgn(moves: string[], startingFen?: string): string {
  try {
    const chess = startingFen ? new Chess(startingFen) : new Chess();
    if (startingFen) {
      chess.setHeader("SetUp", "1");
      chess.setHeader("FEN", startingFen);
    }
    for (const move of moves) {
      chess.move(move);
    }
    return chess.pgn();
  } catch {
    throw new Error("Invalid moves sequence");
  }
}

export function validatePgnWithDetails(pgn: string): {
  valid: boolean;
  error?: string;
  moveCount?: number;
} {
  if (!pgn.trim()) {
    return { valid: false, error: "PGN cannot be empty" };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history();
    return {
      valid: true,
      moveCount: history.length,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid PGN format",
    };
  }
}

export function getPgnHeaders(pgn: string): Record<string, string> {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.getHeaders();
  } catch {
    return {};
  }
}

export function getPgnHistory(
  pgn: string,
  options?: { verbose?: boolean },
): string[] | MoveResult[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    if (options?.verbose) {
      return chess.history({ verbose: true }).map(toMoveResult);
    }
    return chess.history();
  } catch {
    return [];
  }
}

// ── Validation (combines parsing + chess.js) ────────────────

/**
 * Validate that all moves are legal from the given FEN.
 * Accepts unvalidated move strings (e.g. from `flattenPgnMoves`) and
 * returns the subset that are legal as `AlgebraicNotation[]`.
 */
export function validatePgnMoves(
  fen: string,
  moves: string[],
): { valid: boolean; error?: string; validMoves: AlgebraicNotation[] } {
  try {
    const result = validateMoveSequence(fen, moves);
    if (!result.valid) {
      return {
        valid: false,
        error: result.error,
        validMoves: result.validMoves as AlgebraicNotation[],
      };
    }
    return {
      valid: true,
      validMoves: result.validMoves as AlgebraicNotation[],
    };
  } catch {
    return {
      valid: false,
      error: "Invalid FEN position",
      validMoves: [],
    };
  }
}

// ── Attached-PGN validation (comment attachment use case) ───

/**
 * Result enum for `validateAttachedPgn` error cases. Locked to four
 * values so the consuming UI can switch-exhaustively on them.
 */
export type AttachedPgnError =
  | "empty"
  | "too_large"
  | "invalid_pgn"
  | "no_moves";

/**
 * Result of validating a PGN string for use as a topic post attachment.
 * On success, returns the normalized PGN, byte length, move count,
 * starting FEN (only when non-default), and extracted headers.
 *
 * On failure, returns an enum-tagged error plus an optional `detail`
 * string for admin/debug logging. `detail` MUST NOT be shown to the
 * end user — PGN headers may contain hostile text and chess.js error
 * messages may leak input fragments.
 */
export type ValidateAttachedPgnResult =
  | {
      ok: true;
      normalized: string;
      byteLength: number;
      moveCount: number;
      startingFen: string | null;
      headers: {
        white: string | null;
        black: string | null;
        result: string | null;
        event: string | null;
        site: string | null;
        date: string | null;
      };
    }
  | { ok: false; error: AttachedPgnError; detail?: string };

const DEFAULT_MAX_PGN_BYTES = 102_400;
const ANONYMOUS_WHITE = "Player 1";
const ANONYMOUS_BLACK = "Player 2";

function getUtf8ByteLength(value: string): number {
  // Server runtimes (Node) have Buffer; Edge / browsers may not. Prefer
  // Buffer when available because it's slightly cheaper for long strings,
  // but fall back to TextEncoder unconditionally so this stays
  // platform-pure and works under Edge / Metro.
  if (
    typeof globalThis !== "undefined" &&
    typeof (
      globalThis as {
        Buffer?: { byteLength: (s: string, enc: string) => number };
      }
    ).Buffer !== "undefined"
  ) {
    const B = (
      globalThis as {
        Buffer: { byteLength: (s: string, enc: string) => number };
      }
    ).Buffer;
    return B.byteLength(value, "utf8");
  }
  return new TextEncoder().encode(value).byteLength;
}

function nullableHeader(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed === "?") return null;
  return trimmed;
}

/**
 * Validate, normalize, and extract metadata from a PGN string in one call.
 *
 * Designed for the comment-attachment use case: returns everything the
 * Server Action needs to populate `topic_post_attachments` in a single
 * synchronous step. chess.js is the only external dep.
 *
 * Normalization:
 *   - chess.js's `Chess#pgn()` re-emit is the canonical form (consistent
 *     line breaks, header order, move number formatting).
 *   - If `opts.anonymize` is true, `White` and `Black` headers are
 *     replaced with 'Player 1' / 'Player 2' BEFORE re-emit, so the
 *     returned `normalized` PGN no longer contains the original names.
 *
 * Limits:
 *   - `opts.maxBytes` (default 102_400) — UTF-8 byte length cap.
 *   - Returns `{ ok: false, error: 'too_large' }` BEFORE invoking chess.js
 *     so a multi-MB PGN cannot DoS the parser.
 *
 * Error mapping:
 *   - `empty`: `pgn.trim().length === 0`
 *   - `too_large`: byte length over `maxBytes`
 *   - `no_moves`: parsed successfully but `history().length === 0`
 *   - `invalid_pgn`: catch-all for any chess.js parse failure
 */
export function validateAttachedPgn(
  pgn: string,
  opts?: { maxBytes?: number; anonymize?: boolean },
): ValidateAttachedPgnResult {
  if (typeof pgn !== "string" || pgn.trim().length === 0) {
    return { ok: false, error: "empty" };
  }

  const maxBytes = opts?.maxBytes ?? DEFAULT_MAX_PGN_BYTES;
  const inputByteLength = getUtf8ByteLength(pgn);
  if (inputByteLength > maxBytes) {
    return { ok: false, error: "too_large" };
  }

  let chess: Chess;
  try {
    chess = new Chess();
    chess.loadPgn(pgn);
  } catch (error) {
    return {
      ok: false,
      error: "invalid_pgn",
      detail: error instanceof Error ? error.message : "loadPgn failed",
    };
  }

  const moveHistory = chess.history();
  if (moveHistory.length === 0) {
    return { ok: false, error: "no_moves" };
  }

  if (opts?.anonymize) {
    chess.setHeader("White", ANONYMOUS_WHITE);
    chess.setHeader("Black", ANONYMOUS_BLACK);
  }

  const headers = chess.getHeaders();
  const startingFen = headers.FEN;
  const isCustomPosition = startingFen && startingFen !== DEFAULT_POSITION;

  const normalized = chess.pgn();
  const normalizedByteLength = getUtf8ByteLength(normalized);

  // The re-emitted PGN can in pathological cases be larger than the input
  // (e.g. when chess.js inserts result markers or reformats headers). Re-check
  // against the cap so the caller never has to handle an oversized normalized
  // value that would fail the DB CHECK constraint downstream.
  if (normalizedByteLength > maxBytes) {
    return { ok: false, error: "too_large" };
  }

  return {
    ok: true,
    normalized,
    byteLength: normalizedByteLength,
    moveCount: moveHistory.length,
    startingFen: isCustomPosition ? startingFen : null,
    headers: {
      white: opts?.anonymize ? ANONYMOUS_WHITE : nullableHeader(headers.White),
      black: opts?.anonymize ? ANONYMOUS_BLACK : nullableHeader(headers.Black),
      result: nullableHeader(headers.Result),
      event: nullableHeader(headers.Event),
      site: nullableHeader(headers.Site),
      date: nullableHeader(headers.Date),
    },
  };
}

/**
 * Parse and validate FEN and PGN, returning structured data.
 */
export function parsePgnMoveSequence(
  fen: string,
  pgn: string,
):
  | { success: true; data: ParsedMoveSequence }
  | { success: false; error: string } {
  if (!validateFen(fen)) {
    return { success: false, error: "Invalid FEN position" };
  }

  const turn = getTurnFromFen(fen);

  const parsedMoves = parsePgnMoves(pgn);
  if (parsedMoves.length === 0) {
    return { success: false, error: "No moves found in PGN" };
  }

  const moves = flattenPgnMoves(parsedMoves);
  if (moves.length === 0) {
    return { success: false, error: "No valid moves found in PGN" };
  }

  const validation = validatePgnMoves(fen, moves);
  if (!validation.valid) {
    return { success: false, error: validation.error || "Invalid moves" };
  }

  return {
    success: true,
    data: {
      fen,
      moves: validation.validMoves,
      playerColor: turn,
    },
  };
}
