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

/**
 * Parse FEN piece placement into a flat 64-element array of piece characters.
 * Index 0 = a8, index 1 = b8, ..., index 63 = h1.
 * Empty squares are represented as empty strings.
 * Only the piece placement part of the FEN is used (before the first space).
 */
export function fenToBoardFlat(fen: string): string[] {
  const piecePlacement = fen.split(" ")[0];
  const board: string[] = new Array(64).fill("");
  let squareIndex = 0;

  for (const char of piecePlacement) {
    if (char === "/") {
      continue;
    } else if (/\d/.test(char)) {
      squareIndex += parseInt(char);
    } else {
      board[squareIndex] = char;
      squareIndex++;
    }
  }

  return board;
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
