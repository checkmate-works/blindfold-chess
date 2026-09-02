import { type Result, err, ok } from "../utils/result";
import type { AlgebraicNotation, PieceColor } from "@blindfold-chess/types";
import { Chess, DEFAULT_POSITION } from "chess.js";

import { boardFrom } from "./replay";

import { getTurnFromFen, validateFen } from "./fen";
import type { MoveSequenceValidation } from "./moves";
import { validateMoveSequence } from "./moves";
import type { MoveResult } from "./types";
import { asEngineSan, toMoveResult } from "./types";

// Re-export pure formatting types and functions from pgn-format
export type {
  FormattedPgnMove,
  FormattedPgn,
  ParsedPgnMove,
} from "./pgn-format";
export {
  formatMovesToPgn,
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
  playerColor: PieceColor;
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

/**
 * Why a PGN could not be loaded. chess.js reports only that its parse
 * failed, so there is one kind; `cause` carries whatever it threw, for logs.
 * (The variation-aware {@link parsePgnTree} reports a *located* failure —
 * prefer it when the caller wants to say which move was illegal.)
 */
export type PgnLoadError = { kind: "invalid-pgn"; cause: unknown };

/**
 * Load a PGN's mainline moves.
 *
 * Returns a {@link Result}: the input is stored rows, seeded data or pasted
 * text, so failing to parse is an ordinary outcome. As an untyped `throw` the
 * contract was unenforceable — six call sites carefully recovered while two
 * (an opening's board `useMemo` and a start-game click handler) called it bare,
 * so one bad row blew up an error boundary instead of degrading.
 */
export function parsePgn(
  pgn: string,
): Result<AlgebraicNotation[], PgnLoadError> {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return ok(chess.history().map(asEngineSan));
  } catch (cause) {
    return err({ kind: "invalid-pgn", cause });
  }
}

/** As {@link parsePgn}, plus the `[FEN]` header when the game has one. */
export function parsePgnWithFen(pgn: string): Result<
  {
    moves: AlgebraicNotation[];
    startingFen?: string;
  },
  PgnLoadError
> {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);

    const headers = chess.getHeaders();
    const startingFen = headers.FEN;
    const isCustomPosition = startingFen && startingFen !== DEFAULT_POSITION;

    return ok({
      moves: chess.history().map(asEngineSan),
      startingFen: isCustomPosition ? startingFen : undefined,
    });
  } catch (cause) {
    return err({ kind: "invalid-pgn", cause });
  }
}

export function generatePgn(moves: string[], startingFen?: string): string {
  try {
    const chess = boardFrom(startingFen);
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

export function validatePgnWithDetails(
  pgn: string,
): { valid: true; moveCount: number } | { valid: false; error: string } {
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
): AlgebraicNotation[] | MoveResult[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    if (options?.verbose) {
      return chess.history({ verbose: true }).map(toMoveResult);
    }
    return chess.history().map(asEngineSan);
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
): MoveSequenceValidation {
  try {
    const result = validateMoveSequence(fen, moves);
    if (!result.valid) {
      return {
        valid: false,
        error: result.error,
        validMoves: result.validMoves,
      };
    }
    return {
      valid: true,
      validMoves: result.validMoves,
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
