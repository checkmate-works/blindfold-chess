/**
 * Attached-PGN validation — the topic-post / comment "attach a game" use case.
 *
 * Split out from `pgn.ts` (generic chess.js PGN wrappers) because this module
 * sits at a different abstraction level: it owns one specialized end-to-end
 * routine (`validateAttachedPgn`) plus its private helpers, all serving the
 * single concern of turning hostile user-supplied PGN into a safe, normalized,
 * metadata-extracted attachment payload.
 *
 * @design chess.js isolation — this module lives inside `chess-core/`, so it
 * may import `chess.js` directly. Apps must consume it via the chess-core
 * barrel export.
 */
import { Chess, DEFAULT_POSITION } from "chess.js";

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
 * chess.js 1.4.0 fails to parse two adjacent `{...}` PGN comment
 * blocks (e.g. `1. d4 { Mistake. } { [%eval 1.56] [%clk 0:09:46] }`).
 * The PGN spec allows adjacent comment blocks, and Lichess deliberately
 * separates textual annotation from structured `[%eval][%clk]`
 * annotation, so Lichess PGN exports do not load via chess.js as-is.
 *
 * Merge `} <whitespace> {` into a single comment by collapsing the
 * separator to a space. Semantics are preserved (both blocks were
 * comments on the same move) and chess.js then accepts the result.
 *
 * Comment text in PGN cannot contain `{` or `}` (PGN spec, reserved
 * delimiters), so this regex has no false-positive risk inside comment
 * bodies. Comments inside RAV `(...)` are handled by the same rule.
 *
 * @internal — not exported; only used by `validateAttachedPgn`.
 */
function mergeAdjacentPgnComments(pgn: string): string {
  return pgn.replace(/\}\s+\{/g, " ");
}

/**
 * Validate, normalize, and extract metadata from a PGN string in one call.
 *
 * Designed for the comment-attachment use case: returns everything the
 * Server Action needs to populate `post_game_attachments` in a single
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
    // Preprocess Lichess-style adjacent comment blocks before chess.js
    // parsing. See `mergeAdjacentPgnComments` for rationale.
    const preprocessed = mergeAdjacentPgnComments(pgn);
    chess.loadPgn(preprocessed);
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
