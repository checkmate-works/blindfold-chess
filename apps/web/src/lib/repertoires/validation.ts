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
/** Max length of an owner's per-move "why" annotation. */
export const REPERTOIRE_ANNOTATION_MAX = 2000;
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

export type RepertoireLineEditInput = {
  /** Trimmed to null when blank — a line may be unnamed (falls back to "Line N"). */
  name: string | null;
  pgn: string;
  /** The line's fixed root position (editing changes the moves, not the root). */
  startingFen: string | null;
};

export type RepertoireLineEditError =
  | 'nameTooLong'
  | 'pgnRequired'
  | 'pgnTooLarge'
  | 'invalidPgn'
  | 'noMoves';

export type ValidateLineEditResult =
  | { ok: true; data: { name: string | null; pgn: string } }
  | { ok: false; error: RepertoireLineEditError };

/**
 * Validate a single line's edited moves + name. The textbox holds just the
 * moves; we validate them from the line's existing root (so non-standard starts
 * still check out), take the main line if variations were pasted, and re-emit a
 * clean PGN. The line's `seq` (and therefore its identity / URL) is unchanged;
 * position-keyed annotations and comments follow the surviving positions on
 * their own, so there is nothing to migrate here.
 */
export function validateRepertoireLineEdit(input: RepertoireLineEditInput): ValidateLineEditResult {
  const name = input.name?.trim() || null;
  if (name && name.length > REPERTOIRE_NAME_MAX) return { ok: false, error: 'nameTooLong' };

  const pgn = input.pgn?.trim() ?? '';
  if (!pgn) return { ok: false, error: 'pgnRequired' };
  if (byteLength(pgn) > REPERTOIRE_PGN_MAX_BYTES) return { ok: false, error: 'pgnTooLarge' };

  // Non-standard-start lines store their PGN with a [FEN] header (see
  // generatePgn), and that text prefills the editor — so only prepend the root
  // header when the moves don't already carry one, to avoid a double header.
  const hasFenHeader = /\[FEN\b/i.test(pgn);
  const fullPgn =
    input.startingFen && !hasFenHeader
      ? `[FEN "${input.startingFen}"]\n[SetUp "1"]\n\n${pgn}`
      : pgn;

  let tree: PgnTree;
  try {
    tree = parsePgnTree(fullPgn);
  } catch {
    return { ok: false, error: 'invalidPgn' };
  }

  const mainLine = enumerateLines(tree)[0] ?? [];
  if (mainLine.length === 0) return { ok: false, error: 'noMoves' };

  return {
    ok: true,
    data: { name, pgn: generatePgn(mainLine, input.startingFen ?? undefined) },
  };
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
