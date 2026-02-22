import { Chess, DEFAULT_POSITION } from "chess.js";

import type { MoveResult } from "./types";

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
  isValid: boolean;
  error?: string;
  moveCount?: number;
} {
  if (!pgn.trim()) {
    return { isValid: false, error: "PGN cannot be empty" };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history();
    return {
      isValid: true,
      moveCount: history.length,
    };
  } catch (error) {
    return {
      isValid: false,
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
      return chess.history({ verbose: true }).map((m) => ({
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
    return chess.history();
  } catch {
    return [];
  }
}
