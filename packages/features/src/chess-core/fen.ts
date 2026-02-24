import { Chess, DEFAULT_POSITION } from "chess.js";

import type { BoardPiece } from "./types";

export function validateFen(fen: string): boolean {
  if (!fen.trim()) return false;

  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export function fenToBoard(fen: string): BoardPiece[][] {
  const chess = new Chess(fen);
  return chess.board();
}

export function getTurnFromFen(fen: string): "w" | "b" {
  const chess = new Chess(fen);
  return chess.turn();
}

export function getFenAfterMoves(initialFen: string, moves: string[]): string {
  const chess = new Chess(initialFen);
  for (const move of moves) {
    chess.move(move);
  }
  return chess.fen();
}

export function getStartingFen(): string {
  return DEFAULT_POSITION;
}
