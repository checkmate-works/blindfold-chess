import { enumerateLines, generatePgn, parsePgnTree } from '@blindfold-chess/features/chess-core';
import { STARTING_FEN } from '@blindfold-chess/features/chess-core/fen';
import type { Side } from '@blindfold-chess/types';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { isEmptyBoardAnnotations } from '@/lib/board-annotations/types';
// Deep import (not the '@/lib/points' barrel): spend-catalog is pure, whereas
// the barrel pulls in `server-only` consume/redeem modules that must not reach
// this validator's client-reachable bundle.
import type { RepertoireVisibility } from '@/lib/points/spend-catalog';
import { isRepertoireVisibility } from '@/lib/points/spend-catalog';

/**
 * Validation + decomposition for an imported repertoire (型 / course).
 *
 * A repertoire is pasted as one PGN-with-variations. We validate it by parsing
 * the tree (every move, main line and variations, checked through chess.js) and
 * then DECOMPOSE it into its individual lines (root-to-leaf paths) — each line
 * becomes one `repertoire_lines` row (the source of truth). `enumerateLines`
 * does the split; `generatePgn` re-emits each line as its own PGN.
 */

export const REPERTOIRE_NAME_MAX = 120;
/** Max length of the course-level description blurb. */
export const REPERTOIRE_DESCRIPTION_MAX = 2000;
/** Mirrors the PGN attachment cap (100 KiB). */
export const REPERTOIRE_PGN_MAX_BYTES = 100 * 1024;
/** Max length of an owner's per-move "why" annotation. */
export const REPERTOIRE_ANNOTATION_MAX = 2000;
/**
 * The phases a kata can cover, as the one list the union, the DB column's
 * `$type` and the import form's radio group all derive from.
 *
 * Annotating a `readonly RepertoirePhase[]` instead would accept a subset, so
 * a phase added to the union and forgotten here would compile and simply
 * vanish from the form.
 */
export const REPERTOIRE_PHASES = ['opening', 'middlegame', 'endgame'] as const;

export type RepertoirePhase = (typeof REPERTOIRE_PHASES)[number];

export type RepertoireImportInput = {
  name: string;
  side: Side;
  phase: RepertoirePhase;
  description?: string | null;
  pgn: string;
  /**
   * The visibility to create-and-publish at (coin-gated). Absent → `public`
   * (free, the default). `followers_only` / `private` charge coins in the
   * create transaction.
   */
  visibility?: RepertoireVisibility;
  /** Opening ids to link (only honoured when phase === 'opening'). */
  openingIds?: string[];
  /**
   * Owner's "why this move" notes authored during board-mode import, keyed by
   * position key (normalised FEN after the move — same key `saveAnnotation`
   * writes under). Inserted with the repertoire so a board-built kata lands
   * with its notes attached.
   */
  annotations?: Record<string, string>;
  /**
   * Board markup (arrows / circles) drawn during board-mode import, keyed by
   * position key. Crosses the network as JSON, so each entry is re-parsed
   * (`parseBoardAnnotations`) rather than trusted — same as `saveShapes`.
   */
  shapes?: Record<string, unknown>;
};

/** Sanity caps for imported notes (the map is client-built, so belt+braces). */
const ANNOTATION_MAX_COUNT = 500;
const POSITION_KEY_MAX = 120;

/** One decomposed line, ready to insert as a `repertoire_lines` row. */
export type ImportedLine = { pgn: string; startingFen: string | null };

export type ValidatedRepertoireImport = {
  name: string;
  side: Side;
  phase: RepertoirePhase;
  description: string | null;
  /** Visibility to publish at (defaults to `public`). */
  visibility: RepertoireVisibility;
  /** Root position shared by every line. NULL = standard start. */
  startingFen: string | null;
  lines: ImportedLine[];
  /**
   * Cleaned position-keyed notes / board markup to insert alongside (may be
   * empty). One entry per annotated position; either half may be absent.
   */
  annotations: { positionKey: string; text?: string; shapes?: BoardAnnotations }[];
};

export type RepertoireValidationError =
  | 'nameRequired'
  | 'nameTooLong'
  | 'invalidSide'
  | 'invalidPhase'
  | 'pgnRequired'
  | 'pgnTooLarge'
  | 'invalidPgn'
  | 'invalidAnnotations'
  | 'invalidVisibility';

export type ValidateRepertoireResult =
  { ok: true; data: ValidatedRepertoireImport } | { ok: false; error: RepertoireValidationError };

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
  'nameTooLong' | 'pgnRequired' | 'pgnTooLarge' | 'invalidPgn' | 'noMoves';

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

  // The failure names the offending move; this result type carries only a
  // code, so the form re-derives the location with `diagnosePgn`. Widening
  // the code to the located failure is a form/i18n change, not a refactor.
  const parsed = parsePgnTree(fullPgn);
  if (!parsed.ok) return { ok: false, error: 'invalidPgn' };
  const tree = parsed.value;

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

  // Absent → public (free). A present value must be a real tier.
  const visibility: RepertoireVisibility = input.visibility ?? 'public';
  if (!isRepertoireVisibility(visibility)) {
    return { ok: false, error: 'invalidVisibility' };
  }

  const pgn = input.pgn?.trim() ?? '';
  if (!pgn) return { ok: false, error: 'pgnRequired' };
  if (byteLength(pgn) > REPERTOIRE_PGN_MAX_BYTES) {
    return { ok: false, error: 'pgnTooLarge' };
  }

  const parsed = parsePgnTree(pgn);
  if (!parsed.ok) return { ok: false, error: 'invalidPgn' };
  const tree = parsed.value;

  const startingFen = tree.startingFen === STARTING_FEN ? null : tree.startingFen;
  const lines: ImportedLine[] = enumerateLines(tree).map((moves) => ({
    pgn: generatePgn(moves, startingFen ?? undefined),
    startingFen,
  }));

  const description = input.description?.trim() || null;

  // Clean the board-authored notes + markup into one entry per position.
  // Whitespace-only notes and empty / malformed markup are dropped (an emptied
  // draft is "nothing here"); anything over the caps rejects the import — the
  // form enforces the same limits, so hitting them means a bad client.
  const annotationEntries = Object.entries(input.annotations ?? {});
  const shapeEntries = Object.entries(input.shapes ?? {});
  if (
    annotationEntries.length > ANNOTATION_MAX_COUNT ||
    shapeEntries.length > ANNOTATION_MAX_COUNT
  ) {
    return { ok: false, error: 'invalidAnnotations' };
  }
  type AnnotationEntry = { positionKey: string; text?: string; shapes?: BoardAnnotations };
  const byPosition = new Map<string, AnnotationEntry>();
  const entryFor = (positionKey: string): AnnotationEntry => {
    const existing = byPosition.get(positionKey);
    if (existing) return existing;
    const created: AnnotationEntry = { positionKey };
    byPosition.set(positionKey, created);
    return created;
  };
  for (const [positionKey, rawText] of annotationEntries) {
    const text = rawText?.trim() ?? '';
    if (!text) continue;
    if (!positionKey || positionKey.length > POSITION_KEY_MAX) {
      return { ok: false, error: 'invalidAnnotations' };
    }
    if (text.length > REPERTOIRE_ANNOTATION_MAX) {
      return { ok: false, error: 'invalidAnnotations' };
    }
    entryFor(positionKey).text = text;
  }
  for (const [positionKey, rawShapes] of shapeEntries) {
    // The parse drops malformed elements; a set that parses to empty is "no
    // markup" and simply isn't inserted.
    const shapes = parseBoardAnnotations(rawShapes);
    if (isEmptyBoardAnnotations(shapes)) continue;
    if (!positionKey || positionKey.length > POSITION_KEY_MAX) {
      return { ok: false, error: 'invalidAnnotations' };
    }
    entryFor(positionKey).shapes = shapes;
  }
  const annotations = [...byPosition.values()];

  return {
    ok: true,
    data: {
      name,
      side: input.side,
      phase: input.phase,
      description,
      visibility,
      startingFen,
      lines,
      annotations,
    },
  };
}
