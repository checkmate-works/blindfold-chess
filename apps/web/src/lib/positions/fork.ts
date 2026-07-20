/**
 * Fork-source validation and seed-loading for `positions`.
 *
 * `validateForkSource` enforces the three rules that every fork attempt must
 * satisfy regardless of which route invokes the create action:
 *
 *   1. `forkedFromId` parses as a UUID.
 *   2. A row with that id exists, has a `type` in the caller's allowed
 *      source-type set, and is not soft-deleted.
 *   3. The source's `forks_disabled_at` is NULL (the lock is permanent — once
 *      a row is locked, every fork attempt fails here even after the locking
 *      user's paid-plan privilege lapses).
 *
 * Self-forking (the source is owned by the current user) is intentionally
 * allowed: it is the natural way to spin up a derived variation of one's own
 * puzzle/position. The like-coin batch independently withholds fork-propagation
 * coins when parent owner == fork owner, so no coin farming is opened up here.
 *
 * @design Cross-type sourcing: memory → puzzle only
 * `PUZZLE_FORK_SOURCE_TYPES` accepts both `puzzle` and `memory` sources — a
 * position-memory entry can seed a new puzzle ("Create puzzle from here" on
 * the position-memory detail page), reusing the same lineage column
 * (`forkedFromId`) and the same like-coin propagation as a same-type fork.
 * `POSITION_FORK_SOURCE_TYPES` stays `memory`-only: there is no reverse path
 * (a puzzle "downgrading" into a position-memory entry would need to discard
 * its solution, which the existing FEN-only seed at `/practice/position-memory/
 * new?fen=<...>` already covers without any lineage/coin semantics attached).
 * The UI deliberately does not call the cross-type action a "fork" — see the
 * `createPuzzleFromHere` button copy — but internally it is one: same column,
 * same validation, same coin propagation, just a different allowed source type.
 *
 * `loadPuzzleForkSeed` / `loadPositionForkSeed` apply the same rules at SSR
 * time on the `/new?from=<id>` pages, plus fetch the full set of fields the
 * authoring form needs to prefill (FEN, title, description, tag IDs, and —
 * for puzzles — the canonical solution-move sequence, empty when the source
 * is a position-memory entry since it never had one). On any failure they
 * return `null` so the page can silently fall through to a blank new form.
 *
 * Both call sites share `validateForkSource` so the create-time and
 * load-time rules cannot drift apart in review.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db, positionChunks, positionThemes, positions, puzzleSolutions } from '@/lib/db';
import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import { UUID_RE } from '@/lib/validations/uuid';

import type { PositionType } from './types';

/** Source types accepted when creating a new puzzle via `?from=<id>`. */
export const PUZZLE_FORK_SOURCE_TYPES = ['puzzle', 'memory'] as const satisfies PositionType[];

/** Source types accepted when creating a new position-memory entry via `?from=<id>`. */
export const POSITION_FORK_SOURCE_TYPES = ['memory'] as const satisfies PositionType[];

export type ValidateForkSourceResult =
  // userId may be null when the source position's author was anonymised
  // (account purged). Forking public content is still allowed; only `.id` is
  // consumed downstream.
  | {
      ok: true;
      source: { id: string; userId: string | null; title: string; type: PositionType };
    }
  | {
      ok: false;
      reason: 'invalid_uuid' | 'not_found' | 'forks_disabled';
    };

export async function validateForkSource(params: {
  forkedFromId: string;
  // Retained in the signature for call-site stability (seed loaders forward it),
  // but no longer gates anything now that self-forking is allowed.
  currentUserId: string;
  sourceTypes: readonly PositionType[];
}): Promise<ValidateForkSourceResult> {
  const { forkedFromId, sourceTypes } = params;

  if (!UUID_RE.test(forkedFromId)) {
    return { ok: false, reason: 'invalid_uuid' };
  }

  const [row] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      title: positions.title,
      type: positions.type,
      forksDisabledAt: positions.forksDisabledAt,
    })
    .from(positions)
    .where(
      and(
        eq(positions.id, forkedFromId),
        inArray(positions.type, sourceTypes as string[]),
        isNull(positions.deletedAt)
      )
    )
    .limit(1);

  if (!row) {
    return { ok: false, reason: 'not_found' };
  }

  if (row.forksDisabledAt !== null) {
    return { ok: false, reason: 'forks_disabled' };
  }

  return {
    ok: true,
    // Safe cast: the WHERE clause already restricted `type` to `sourceTypes`
    // (a `PositionType[]`), so the raw varchar is guaranteed to be one of them.
    source: { id: row.id, userId: row.userId, title: row.title, type: row.type as PositionType },
  };
}

/**
 * Shared seed fields populated from any forkable position row. `themeIds`
 * and `chunkIds` are raw uuids — the client form looks them up against
 * the already-loaded `availableThemes` / `availableChunks` catalogs, same
 * as draft hydration. Tags soft-deleted between fork time and seed read
 * silently drop, mirroring the draft path.
 */
type BaseForkSeed<T extends PositionType> = {
  sourceId: string;
  sourceTitle: string;
  /** The source row's own `positions.type` — lets the create form pick
   * "Forking from" vs. cross-type banner copy (see `PuzzleForkSeedData`'s
   * `@design Cross-type sourcing` note). Narrowed per caller (see
   * `loadPuzzleForkSeed` / `loadPositionForkSeed`) rather than left as the
   * full `PositionType` union, so consumers don't have to handle a
   * `'sequence'` case that can never actually occur for them. */
  sourceType: T;
  fen: string;
  title: string;
  description: string;
  themeIds: string[];
  chunkIds: string[];
};

export type PuzzleForkSeedData = BaseForkSeed<(typeof PUZZLE_FORK_SOURCE_TYPES)[number]> & {
  moves: string[];
  notes: string[];
};

export type PositionForkSeedData = BaseForkSeed<(typeof POSITION_FORK_SOURCE_TYPES)[number]>;

async function loadBaseForkRow<T extends PositionType>(params: {
  sourceId: string;
  currentUserId: string;
  sourceTypes: readonly T[];
}): Promise<BaseForkSeed<T> | null> {
  const check = await validateForkSource({
    forkedFromId: params.sourceId,
    currentUserId: params.currentUserId,
    sourceTypes: params.sourceTypes,
  });
  if (!check.ok) return null;

  const [position] = await db
    .select({
      id: positions.id,
      title: positions.title,
      fen: positions.fen,
      description: positions.description,
    })
    .from(positions)
    .where(eq(positions.id, check.source.id))
    .limit(1);

  if (!position) return null;

  const [themeRows, chunkRows] = await Promise.all([
    db
      .select({ termId: positionThemes.termId })
      .from(positionThemes)
      .where(eq(positionThemes.positionId, position.id)),
    db
      .select({ chunkId: positionChunks.chunkId })
      .from(positionChunks)
      .where(eq(positionChunks.positionId, position.id)),
  ]);

  return {
    sourceId: position.id,
    sourceTitle: position.title,
    // Safe cast: `check.source.type` is one of `params.sourceTypes` (a
    // `readonly T[]`), enforced by validateForkSource's WHERE clause.
    sourceType: check.source.type as T,
    fen: position.fen,
    title: position.title,
    description: position.description ?? '',
    themeIds: themeRows.map((r) => r.termId),
    chunkIds: chunkRows.map((r) => r.chunkId),
  } satisfies BaseForkSeed<T>;
}

export async function loadPuzzleForkSeed(params: {
  sourceId: string;
  currentUserId: string;
}): Promise<PuzzleForkSeedData | null> {
  const base = await loadBaseForkRow({
    sourceId: params.sourceId,
    currentUserId: params.currentUserId,
    sourceTypes: PUZZLE_FORK_SOURCE_TYPES,
  });
  if (!base) return null;

  // A puzzle row is expected to have exactly one row in puzzle_solutions;
  // missing row = corrupted seed source, so we fall back to no moves.
  const [solution] = await db
    .select({ solutionMoves: puzzleSolutions.solutionMoves })
    .from(puzzleSolutions)
    .where(eq(puzzleSolutions.positionId, base.sourceId))
    .limit(1);

  const sequence: PuzzleSolutionMove[] = solution?.solutionMoves ?? [];

  return {
    ...base,
    moves: sequence.map((m) => m.san),
    notes: sequence.map((m) => m.note ?? ''),
  };
}

export async function loadPositionForkSeed(params: {
  sourceId: string;
  currentUserId: string;
}): Promise<PositionForkSeedData | null> {
  return loadBaseForkRow({
    sourceId: params.sourceId,
    currentUserId: params.currentUserId,
    sourceTypes: POSITION_FORK_SOURCE_TYPES,
  });
}
