import type { PgnTree } from '@blindfold-chess/features/chess-core';
import { enumerateLines, generatePgn, parsePgnTree } from '@blindfold-chess/features/chess-core';

/**
 * Validation + decomposition for an imported repertoire (型 / course).
 *
 * A repertoire is pasted as one PGN-with-variations. We validate it by parsing
 * the tree (every move, main line and variations, checked through chess.js) and
 * then DECOMPOSE it into its individual lines (root-to-leaf paths) — each line
 * becomes one `repertoire_lines` row (the source of truth). `enumerateLines`
 * does the split; `generatePgn` re-emits each line as its own PGN.
 */

export type RepertoireSide = 'white' | 'black';
export type RepertoirePhase = 'opening' | 'middlegame' | 'endgame';

export const REPERTOIRE_NAME_MAX = 120;
/** Mirrors the PGN attachment cap (100 KiB). */
export const REPERTOIRE_PGN_MAX_BYTES = 100 * 1024;
export const REPERTOIRE_PHASES: readonly RepertoirePhase[] = ['opening', 'middlegame', 'endgame'];

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type RepertoireImportInput = {
  name: string;
  side: RepertoireSide;
  phase: RepertoirePhase;
  description?: string | null;
  pgn: string;
  /** Opening ids to link (only honoured when phase === 'opening'). */
  openingIds?: string[];
};

/** One decomposed line, ready to insert as a `repertoire_lines` row. */
export type ImportedLine = { pgn: string; startingFen: string | null };

export type ValidatedRepertoireImport = {
  name: string;
  side: RepertoireSide;
  phase: RepertoirePhase;
  description: string | null;
  /** Root position shared by every line. NULL = standard start. */
  startingFen: string | null;
  lines: ImportedLine[];
};

export type RepertoireValidationError =
  | 'nameRequired'
  | 'nameTooLong'
  | 'invalidSide'
  | 'invalidPhase'
  | 'pgnRequired'
  | 'pgnTooLarge'
  | 'invalidPgn';

export type ValidateRepertoireResult =
  | { ok: true; data: ValidatedRepertoireImport }
  | { ok: false; error: RepertoireValidationError };

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function validateRepertoireImport(input: RepertoireImportInput): ValidateRepertoireResult {
  const name = input.name?.trim() ?? '';
  if (!name) return { ok: false, error: 'nameRequired' };
  if (name.length > REPERTOIRE_NAME_MAX) return { ok: false, error: 'nameTooLong' };

  if (input.side !== 'white' && input.side !== 'black') {
    return { ok: false, error: 'invalidSide' };
  }
  if (!REPERTOIRE_PHASES.includes(input.phase)) {
    return { ok: false, error: 'invalidPhase' };
  }

  const pgn = input.pgn?.trim() ?? '';
  if (!pgn) return { ok: false, error: 'pgnRequired' };
  if (byteLength(pgn) > REPERTOIRE_PGN_MAX_BYTES) {
    return { ok: false, error: 'pgnTooLarge' };
  }

  let tree: PgnTree;
  try {
    tree = parsePgnTree(pgn);
  } catch {
    return { ok: false, error: 'invalidPgn' };
  }

  const startingFen = tree.startingFen === STANDARD_FEN ? null : tree.startingFen;
  const lines: ImportedLine[] = enumerateLines(tree).map((moves) => ({
    pgn: generatePgn(moves, startingFen ?? undefined),
    startingFen,
  }));

  const description = input.description?.trim() || null;

  return {
    ok: true,
    data: { name, side: input.side, phase: input.phase, description, startingFen, lines },
  };
}
