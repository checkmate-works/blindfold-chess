import type { PgnTree } from '@blindfold-chess/features/chess-core';
import { parsePgnTree } from '@blindfold-chess/features/chess-core';

/**
 * Validation + light analysis for imported repertoire lines (型).
 *
 * The branching tree is validated by actually parsing it with `parsePgnTree`
 * (every move, main line and variations, is checked through chess.js), so a
 * malformed or illegal PGN is rejected at import time rather than surfacing
 * later when the deviation matcher runs.
 */

export type LineSide = 'white' | 'black';

export const LINE_NAME_MAX = 120;
/** Mirrors the PGN attachment cap (100 KiB) used elsewhere. */
export const LINE_PGN_MAX_BYTES = 100 * 1024;

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type LineImportInput = {
  name: string;
  side: LineSide;
  pgn: string;
};

export type ValidatedLineImport = {
  name: string;
  side: LineSide;
  pgn: string;
  /** NULL for the standard start; the root FEN otherwise. */
  startingFen: string | null;
};

export type LineValidationError =
  | 'nameRequired'
  | 'nameTooLong'
  | 'invalidSide'
  | 'pgnRequired'
  | 'pgnTooLarge'
  | 'invalidPgn';

export type ValidateLineResult =
  | { ok: true; data: ValidatedLineImport }
  | { ok: false; error: LineValidationError };

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function validateLineImport(input: LineImportInput): ValidateLineResult {
  const name = input.name?.trim() ?? '';
  if (!name) return { ok: false, error: 'nameRequired' };
  if (name.length > LINE_NAME_MAX) return { ok: false, error: 'nameTooLong' };

  if (input.side !== 'white' && input.side !== 'black') {
    return { ok: false, error: 'invalidSide' };
  }

  const pgn = input.pgn?.trim() ?? '';
  if (!pgn) return { ok: false, error: 'pgnRequired' };
  if (byteLength(pgn) > LINE_PGN_MAX_BYTES) {
    return { ok: false, error: 'pgnTooLarge' };
  }

  let tree: PgnTree;
  try {
    tree = parsePgnTree(pgn);
  } catch {
    return { ok: false, error: 'invalidPgn' };
  }

  return {
    ok: true,
    data: {
      name,
      side: input.side,
      pgn,
      startingFen: tree.startingFen === STANDARD_FEN ? null : tree.startingFen,
    },
  };
}

export type LineTreeSummary = {
  /** Distinct root-to-leaf paths through the tree. */
  lineCount: number;
  /** Total moves (nodes) in the tree. */
  moveCount: number;
  /** Length of the longest line, in plies. */
  maxDepth: number;
};

/**
 * Summarize a parsed tree for list/detail display ("3 lines · 14 moves").
 * Best-effort: returns zeros if the PGN no longer parses (it always should,
 * since it was validated at import).
 */
export function summarizeLinePgn(pgn: string): LineTreeSummary {
  let tree: PgnTree;
  try {
    tree = parsePgnTree(pgn);
  } catch {
    return { lineCount: 0, moveCount: 0, maxDepth: 0 };
  }

  let lineCount = 0;
  let moveCount = 0;
  let maxDepth = 0;

  const walk = (nodes: PgnTree['children'], depth: number): void => {
    if (nodes.length === 0) {
      lineCount += 1;
      maxDepth = Math.max(maxDepth, depth);
      return;
    }
    for (const node of nodes) {
      moveCount += 1;
      walk(node.children, depth + 1);
    }
  };
  walk(tree.children, 0);

  return { lineCount, moveCount, maxDepth };
}
