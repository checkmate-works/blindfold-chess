/**
 * Fork-source validation and seed-loading for `positions`.
 *
 * `validateForkSource` enforces the four rules that every fork attempt must
 * satisfy regardless of which route invokes the create action:
 *
 *   1. `forkedFromId` parses as a UUID.
 *   2. A row with that id exists, has matching `type`, and is not soft-deleted.
 *   3. The source's author is not the current user (no self-fork).
 *   4. The source's `forks_disabled_at` is NULL (the lock is permanent — once
 *      a row is locked, every fork attempt fails here even after the locking
 *      user's paid-plan privilege lapses).
 *
 * `loadPuzzleForkSeed` / `loadPositionForkSeed` apply the same rules at SSR
 * time on the `/new?from=<id>` pages, plus fetch the full set of fields the
 * authoring form needs to prefill (FEN, title, description, tag IDs, and —
 * for puzzles — the canonical solution-move sequence). On any failure they
 * return `null` so the page can silently fall through to a blank new form.
 *
 * Both call sites share `validateForkSource` so the create-time and
 * load-time rules cannot drift apart in review.
 */
import { and, eq, isNull } from 'drizzle-orm';

import { db, positionChunks, positionThemes, positions, puzzleSolutions } from '@/lib/db';
import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import { UUID_RE } from '@/lib/validations/uuid';

import type { PositionType } from './types';

export type ValidateForkSourceResult =
  // userId may be null when the source position's author was anonymised
  // (account purged). Forking public content is still allowed; only `.id` is
  // consumed downstream. The self-fork check tolerates a null author.
  | { ok: true; source: { id: string; userId: string | null; title: string } }
  | {
      ok: false;
      reason: 'invalid_uuid' | 'not_found' | 'self_fork' | 'forks_disabled';
    };

export async function validateForkSource(params: {
  forkedFromId: string;
  currentUserId: string;
  type: PositionType;
}): Promise<ValidateForkSourceResult> {
  const { forkedFromId, currentUserId, type } = params;

  if (!UUID_RE.test(forkedFromId)) {
    return { ok: false, reason: 'invalid_uuid' };
  }

  const [row] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      title: positions.title,
      forksDisabledAt: positions.forksDisabledAt,
    })
    .from(positions)
    .where(
      and(eq(positions.id, forkedFromId), eq(positions.type, type), isNull(positions.deletedAt))
    )
    .limit(1);

  if (!row) {
    return { ok: false, reason: 'not_found' };
  }

  if (row.userId === currentUserId) {
    return { ok: false, reason: 'self_fork' };
  }

  if (row.forksDisabledAt !== null) {
    return { ok: false, reason: 'forks_disabled' };
  }

  return {
    ok: true,
    source: { id: row.id, userId: row.userId, title: row.title },
  };
}

/**
 * Shared seed fields populated from any forkable position row. `themeIds`
 * and `chunkIds` are raw uuids — the client form looks them up against
 * the already-loaded `availableThemes` / `availableChunks` catalogs, same
 * as draft hydration. Tags soft-deleted between fork time and seed read
 * silently drop, mirroring the draft path.
 */
type BaseForkSeed = {
  sourceId: string;
  sourceTitle: string;
  fen: string;
  title: string;
  description: string;
  themeIds: string[];
  chunkIds: string[];
};

export type PuzzleForkSeedData = BaseForkSeed & {
  moves: string[];
  notes: string[];
};

export type PositionForkSeedData = BaseForkSeed;

async function loadBaseForkRow(params: {
  sourceId: string;
  currentUserId: string;
  type: PositionType;
}) {
  const check = await validateForkSource({
    forkedFromId: params.sourceId,
    currentUserId: params.currentUserId,
    type: params.type,
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
    fen: position.fen,
    title: position.title,
    description: position.description ?? '',
    themeIds: themeRows.map((r) => r.termId),
    chunkIds: chunkRows.map((r) => r.chunkId),
  } satisfies BaseForkSeed;
}

export async function loadPuzzleForkSeed(params: {
  sourceId: string;
  currentUserId: string;
}): Promise<PuzzleForkSeedData | null> {
  const base = await loadBaseForkRow({
    sourceId: params.sourceId,
    currentUserId: params.currentUserId,
    type: 'puzzle',
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
    type: 'memory',
  });
}
