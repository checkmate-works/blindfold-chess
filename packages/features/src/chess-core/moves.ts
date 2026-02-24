import type { AlgebraicNotation } from "@blindfold-chess/types";
import { Chess } from "chess.js";

import type { MoveResult, Square } from "./types";

export function validateMoveSequence(
  fen: string,
  moves: string[],
): { valid: boolean; error?: string; validMoves: string[] } {
  const chess = new Chess(fen);
  const validMoves: string[] = [];

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
      validMoves.push(moves[i]);
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
      moveResult: {
        san: result.san,
        from: result.from,
        to: result.to,
        color: result.color,
        piece: result.piece,
        captured: result.captured,
        promotion: result.promotion,
        flags: result.flags,
        before: result.before,
        after: result.after,
      },
    };
  } catch {
    return null;
  }
}

export function getLegalMoves(fen: string): string[];
export function getLegalMoves(
  fen: string,
  options: { verbose: true },
): MoveResult[];
export function getLegalMoves(
  fen: string,
  options: { verbose: false },
): string[];
export function getLegalMoves(
  fen: string,
  options?: { verbose?: boolean },
): string[] | MoveResult[] {
  const chess = new Chess(fen);
  if (options?.verbose) {
    return chess.moves({ verbose: true }).map((m) => ({
      san: m.san,
      from: m.from,
      to: m.to,
      color: m.color,
      piece: m.piece,
      captured: m.captured,
      promotion: m.promotion,
      flags: m.flags,
      before: m.before,
      after: m.after,
    }));
  }
  return chess.moves();
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

export function uciToAlgebraic(uciMove: string, fen: string): string {
  const chess = new Chess(fen);
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove.slice(4) || undefined;

  const result = chess.move({ from, to, promotion });
  return result.san;
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
