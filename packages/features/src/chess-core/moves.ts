import type {
  AlgebraicNotation,
  PieceColor,
  PromotionPiece,
} from "@blindfold-chess/types";
import type { PieceSymbol, Square } from "chess.js";
import { Chess } from "chess.js";

import { type Result, err, ok } from "../utils/result";
import { boardFrom, replaySan } from "./replay";
import type { MoveResult } from "./types";
import { asEngineSan, toMoveResult } from "./types";

/**
 * Result of validating a raw move sequence. `validMoves` carries the legal
 * prefix as canonical SAN in both branches (on failure: every move before
 * the offending one).
 */
export type MoveSequenceValidation =
  | { valid: true; validMoves: AlgebraicNotation[] }
  | { valid: false; error: string; validMoves: AlgebraicNotation[] };

/**
 * Validate a raw move sequence against a position. Accepts unvalidated
 * strings; `validMoves` carries the legal prefix as canonical SAN emitted
 * by chess.js (not the raw input spelling).
 */
export function validateMoveSequence(
  fen: string,
  moves: string[],
): MoveSequenceValidation {
  const { applied, invalidIndex } = replaySan(new Chess(fen), moves, (move) =>
    asEngineSan(move.san),
  );

  if (invalidIndex !== null) {
    return {
      valid: false,
      error: `Invalid move: ${moves[invalidIndex]} at index ${invalidIndex}`,
      validMoves: applied,
    };
  }

  return { valid: true, validMoves: applied };
}

export function executeMove(
  fen: string,
  move: string,
): { fen: string; moveResult: MoveResult } | null {
  try {
    const chess = new Chess(fen);
    const result = chess.move(move);
    if (!result) return null;

    return {
      fen: chess.fen(),
      moveResult: toMoveResult(result),
    };
  } catch {
    return null;
  }
}

export function getLegalMoves(fen: string): AlgebraicNotation[];
export function getLegalMoves(
  fen: string,
  options: { verbose: true },
): MoveResult[];
export function getLegalMoves(
  fen: string,
  options: { verbose: false },
): AlgebraicNotation[];
export function getLegalMoves(
  fen: string,
  options?: { verbose?: boolean },
): AlgebraicNotation[] | MoveResult[] {
  const chess = new Chess(fen);
  if (options?.verbose) {
    return chess.moves({ verbose: true }).map(toMoveResult);
  }
  return chess.moves().map(asEngineSan);
}

export function movesToUci(moves: string[], startingFen?: string): string[] {
  return replaySan(
    boardFrom(startingFen),
    moves,
    (move) => move.from + move.to + (move.promotion || ""),
  ).applied;
}

/**
 * Why a UCI move could not be read as SAN in a given position.
 *
 * Deliberately one shape rather than a malformed/illegal/bad-FEN split.
 * chess.js rejects all three the same way — a string that does not decode
 * into squares (`"invalid"` slices into from `"in"`, to `"va"`) reaches
 * `move()` looking exactly like a well-formed move that happens to be
 * illegal here — so telling them apart would mean re-validating the UCI
 * grammar in this module, and no caller branches on the distinction: every
 * one of them treats "this move cannot be played" as a single outcome.
 * `cause` is what says which of the three actually happened, and it is the
 * only value here that carries a stack from the real failure.
 */
export type UciConversionFailure = {
  /** The UCI string as given, e.g. `"e2e5"`. */
  readonly uciMove: string;
  /** The position it was rejected from. */
  readonly fen: string;
  /** chess.js's own rejection. `unknown` because chess.js is free to throw anything. */
  readonly cause: unknown;
};

/**
 * Convert a UCI move (`e2e4`, `a7a8q`) to SAN in the position `fen`
 * describes.
 *
 * Returns a {@link Result} because failure here is ordinary, not
 * exceptional: the input is engine output or a stored analysis line, and a
 * move that was legal in the position it was generated for is simply
 * illegal when replayed against a different one. Its sibling
 * {@link executeMove} models the same condition with `| null`; this one
 * carries an error payload instead so the caller can report *why* chess.js
 * refused the move — the distinction between a malformed string and a
 * legal-elsewhere move is invisible in the UCI text alone.
 */
export function uciToAlgebraic(
  uciMove: string,
  fen: string,
): Result<AlgebraicNotation, UciConversionFailure> {
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.slice(4) || undefined;

    const result = chess.move({ from, to, promotion });
    return ok(asEngineSan(result.san));
  } catch (cause) {
    return err({ uciMove, fen, cause });
  }
}

export function getLastMoveDetails(
  moves: string[],
  startingFen?: string,
): { from: Square; to: Square } | null {
  if (moves.length === 0) return null;

  const { applied, invalidIndex } = replaySan(
    boardFrom(startingFen),
    moves,
    (move) => ({ from: move.from, to: move.to }),
  );

  // Unlike the truncating helpers, a caller asking for "the last move" of a
  // sequence that turned out to be illegal is not served by the last LEGAL
  // move — that is a different position than the one it asked about.
  if (invalidIndex !== null) return null;
  return applied.at(-1) ?? null;
}

export function replayMoves(
  moves: string[],
  startingFen?: string,
): Array<{ fen: string; lastMove?: { from: Square; to: Square } }> {
  const chess = boardFrom(startingFen);
  // Read before replaying: `chess` is advanced in place, so this must not be
  // deferred to the array literal below.
  const initial = { fen: chess.fen() };
  const { applied } = replaySan(chess, moves, (move, board) => ({
    fen: board.fen(),
    lastMove: { from: move.from, to: move.to },
  }));

  return [initial, ...applied];
}

/**
 * Extract a player's moves from an alternating move sequence.
 * White's moves are at even indices (0, 2, 4, …),
 * Black's moves are at odd indices (1, 3, 5, …).
 */
export function getPlayerMovesFromSequence(
  moves: AlgebraicNotation[],
  playerColor: PieceColor,
): AlgebraicNotation[] {
  const startIndex = playerColor === "w" ? 0 : 1;
  const playerMoves: AlgebraicNotation[] = [];

  for (let i = startIndex; i < moves.length; i += 2) {
    playerMoves.push(moves[i]);
  }

  return playerMoves;
}

/**
 * Find ALL legal moves matching a (from, to) coordinate pair in a given
 * position. Returns an array of 0 (illegal), 1 (non-promotion), or 4
 * (promotion — one entry per Q/R/B/N) {@link MoveResult}s.
 *
 * Intended for interactive board UIs that need to distinguish "this is an
 * unambiguous move, fire it immediately" from "this is a promotion, ask
 * the player which piece to become". The singular {@link findLegalMoveByCoords}
 * is the convenience wrapper that picks one automatically.
 */
export function findLegalMovesByCoords(
  fen: string,
  from: string,
  to: string,
): MoveResult[] {
  const chess = new Chess(fen);
  return chess
    .moves({ verbose: true })
    .filter((m) => m.from === from && m.to === to)
    .map(toMoveResult);
}

/**
 * Find a legal move from a (from, to) coordinate pair in a given position.
 * Returns the matching {@link MoveResult} or null if no such legal move exists.
 *
 * Promotion handling: when the same (from, to) pair has multiple legal moves
 * (only happens for pawn promotion — the destination accepts Q/R/B/N), the
 * `preferredPromotion` argument selects which one to return. Defaults to
 * queen, matching the universal "always promote to queen" UX shortcut. Pass
 * an explicit value (e.g. `'n'` for underpromotion) to override.
 *
 * Intended for board UIs (drag-and-drop, click-to-move) that produce a
 * (from, to) pair and need to translate it into SAN for the move pipeline.
 * Always validates against the actual legal move set — never invents an
 * illegal move from a bad coord pair.
 *
 * Callers that need to *distinguish* a promotion from a regular move (e.g.
 * to surface a promotion picker) should use {@link findLegalMovesByCoords}
 * directly and branch on the array length.
 */
export function findLegalMoveByCoords(
  fen: string,
  from: string,
  to: string,
  preferredPromotion: PromotionPiece = "q",
): MoveResult | null {
  const candidates = findLegalMovesByCoords(fen, from, to);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return (
    candidates.find((m) => m.promotion === preferredPromotion) ?? candidates[0]
  );
}

/**
 * Check if a move is legal for a single white piece placed on an otherwise empty board.
 */
export function isLegalPieceMove(
  from: string,
  to: string,
  pieceType: string,
): boolean {
  const chess = new Chess();
  chess.clear();
  chess.put({ type: pieceType as PieceSymbol, color: "w" }, from as Square);
  try {
    const move = chess.move({ from: from as Square, to: to as Square });
    return move !== null;
  } catch {
    return false;
  }
}

/**
 * Whether `fen` is a checkmate position (the side to move has no legal
 * moves and is in check). Returns `false` for an unparseable FEN rather
 * than throwing, so callers can use it directly on derived/replayed
 * positions without a separate validity check.
 */
export function isCheckmateFen(fen: string): boolean {
  try {
    return new Chess(fen).isCheckmate();
  } catch {
    return false;
  }
}
