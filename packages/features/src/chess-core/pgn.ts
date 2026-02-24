import type { AlgebraicNotation } from "@blindfold-chess/types";
import { Chess, DEFAULT_POSITION } from "chess.js";

import { getTurnFromFen, validateFen } from "./fen";
import { validateMoveSequence } from "./moves";
import type { MoveResult } from "./types";

/**
 * A single move pair in structured PGN representation.
 *
 * Move strings are typed as `string` (not `AlgebraicNotation`) because this
 * type is used for display formatting where moves have already been validated
 * elsewhere (e.g. via `useNotation` or `parsePgnMoveSequence`).
 */
export type FormattedPgnMove = {
  moveNumber: number;
  whiteMove?: string;
  whiteMoveIndex?: number;
  blackMove?: string;
  blackMoveIndex?: number;
};

/**
 * An array of structured move pairs.
 */
export type FormattedPgn = FormattedPgnMove[];

/**
 * A parsed move entry with move number and optional white/black moves.
 *
 * Moves are typed as `string | null` rather than `AlgebraicNotation | null`
 * because this type represents the raw result of PGN text parsing (regex).
 * Move legality is not verified at parse time — use `validatePgnMoves` or
 * `parsePgnMoveSequence` to validate parsed moves against a position.
 */
export type ParsedPgnMove = {
  moveNumber: number;
  white: string | null;
  black: string | null;
};

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

// ── Pure data transforms (no chess.js) ──────────────────────

/**
 * Format structured PGN move pairs to a PGN text string.
 * Optionally includes FEN header for custom starting positions.
 */
export function formatPgnToText(
  formattedPgn: FormattedPgn,
  startingFen?: string,
): string {
  const movesText = formattedPgn
    .map((move) => {
      const moveNumber = `${move.moveNumber}.`;
      if (!move.whiteMove && move.blackMove) {
        return `${moveNumber}.. ${move.blackMove}`;
      }
      const movePair = move.blackMove
        ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
        : `${moveNumber} ${move.whiteMove}`;
      return movePair;
    })
    .join(" ");

  if (startingFen) {
    return `[SetUp "1"]\n[FEN "${startingFen}"]\n\n${movesText}`;
  }

  return movesText;
}

/**
 * Get PGN auto-completion suggestion based on current input.
 * Returns the next move number only when both moves in a pair are complete.
 * Uses pattern matching instead of parsing, so it works with any starting position.
 */
export function getPgnSuggestion(pgn: string): string | null {
  if (!pgn) return "1. ";

  const trimmed = pgn.trimEnd();
  if (!trimmed) return "1. ";

  if (!trimmed.match(/\d+\./)) {
    return "1. ";
  }

  const movePattern = /(\d+)\.\s*(\S+)(?:\s+(\S+))?/g;
  let lastMoveNumber = 0;
  let hasWhiteMove = false;
  let hasBlackMove = false;

  let match;
  while ((match = movePattern.exec(trimmed)) !== null) {
    lastMoveNumber = parseInt(match[1], 10);
    hasWhiteMove = !!match[2];
    hasBlackMove = !!match[3];
  }

  if (lastMoveNumber > 0 && hasWhiteMove && hasBlackMove) {
    return ` ${lastMoveNumber + 1}. `;
  }

  return null;
}

/**
 * Parse PGN move text into structured moves.
 * Format: "1. Kb3 Kc5 2. Kc3 Kd5 3. Kd3 Ke5"
 */
export function parsePgnMoves(pgn: string): ParsedPgnMove[] {
  const moves: ParsedPgnMove[] = [];

  const normalized = pgn.trim().replace(/\s+/g, " ");

  const movePattern = /(\d+)\.\s*(\S+)?(?:\s+(\S+))?/g;

  let match;
  while ((match = movePattern.exec(normalized)) !== null) {
    const moveNumber = parseInt(match[1], 10);
    const firstMove = match[2] || null;
    const secondMove = match[3] || null;

    if (firstMove && firstMove.startsWith(".")) {
      moves.push({
        moveNumber,
        white: null,
        black: firstMove.replace(/^\.+/, ""),
      });
    } else {
      moves.push({
        moveNumber,
        white: firstMove,
        black: secondMove,
      });
    }
  }

  return moves;
}

/**
 * Convert parsed moves to a flat array of move strings.
 */
export function flattenPgnMoves(parsedMoves: ParsedPgnMove[]): string[] {
  const moves: string[] = [];

  for (const move of parsedMoves) {
    if (move.white) {
      moves.push(move.white);
    }
    if (move.black) {
      moves.push(move.black);
    }
  }

  return moves;
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
