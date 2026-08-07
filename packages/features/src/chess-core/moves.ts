import type { AlgebraicNotation } from "@blindfold-chess/types";
import type { PieceSymbol, Square } from "chess.js";
import { Chess } from "chess.js";

import type { MoveResult } from "./types";
import { asEngineSan, toMoveResult } from "./types";

/**
 * Validate a raw move sequence against a position. Accepts unvalidated
 * strings; `validMoves` carries the legal prefix as canonical SAN emitted
 * by chess.js (not the raw input spelling).
 */
export function validateMoveSequence(
  fen: string,
  moves: string[],
): { valid: boolean; error?: string; validMoves: AlgebraicNotation[] } {
  const chess = new Chess(fen);
  const validMoves: AlgebraicNotation[] = [];

  for (let i = 0; i < moves.length; i++) {
    try {
      const result = chess.move(moves[i]);
      if (!result) {
        return {
          valid: false,
          error: `Invalid move: ${moves[i]} at index ${i}`,
          validMoves,
        };
      }
      validMoves.push(asEngineSan(result.san));
    } catch {
      return {
        valid: false,
        error: `Invalid move: ${moves[i]} at index ${i}`,
        validMoves,
      };
    }
  }

  return { valid: true, validMoves };
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
  const chess = startingFen ? new Chess(startingFen) : new Chess();
  const uciMoves: string[] = [];

  for (const move of moves) {
    try {
      const result = chess.move(move);
      if (result) {
        uciMoves.push(result.from + result.to + (result.promotion || ""));
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return uciMoves;
}

export function uciToAlgebraic(
  uciMove: string,
  fen: string,
): AlgebraicNotation {
  const chess = new Chess(fen);
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove.slice(4) || undefined;

  const result = chess.move({ from, to, promotion });
  return asEngineSan(result.san);
}

export function getLastMoveDetails(
  moves: string[],
  startingFen?: string,
): { from: Square; to: Square } | null {
  if (moves.length === 0) return null;

  const chess = startingFen ? new Chess(startingFen) : new Chess();
  let lastResult = null;

  for (const move of moves) {
    try {
      lastResult = chess.move(move);
      if (!lastResult) return null;
    } catch {
      return null;
    }
  }

  if (!lastResult) return null;
  return { from: lastResult.from, to: lastResult.to };
}

export function replayMoves(
  moves: string[],
  startingFen?: string,
): Array<{ fen: string; lastMove?: { from: Square; to: Square } }> {
  const chess = startingFen ? new Chess(startingFen) : new Chess();
  const positions: Array<{
    fen: string;
    lastMove?: { from: Square; to: Square };
  }> = [{ fen: chess.fen() }];

  for (const move of moves) {
    try {
      const result = chess.move(move);
      if (result) {
        positions.push({
          fen: chess.fen(),
          lastMove: { from: result.from, to: result.to },
        });
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return positions;
}

/**
 * Extract a player's moves from an alternating move sequence.
 * White's moves are at even indices (0, 2, 4, …),
 * Black's moves are at odd indices (1, 3, 5, …).
 */
export function getPlayerMovesFromSequence(
  moves: AlgebraicNotation[],
  playerColor: "w" | "b",
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
  preferredPromotion: "q" | "r" | "b" | "n" = "q",
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
