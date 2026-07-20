import {
  enumerateLines,
  generatePgn,
  getStartingFen,
  parsePgnTree,
} from '@blindfold-chess/features/chess-core';
import type { PgnTree } from '@blindfold-chess/features/chess-core';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import {
  chessOpenings,
  db,
  repertoireAnnotations,
  repertoireLines,
  repertoireOpenings,
  repertoires,
} from '@/lib/db';
import { countRows } from '@/lib/db/list-query';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import { assertRepertoireOwner } from './queries';
import type {
  RepertoireImportInput,
  RepertoireLineEditError,
  RepertoirePhase,
  RepertoireSide,
} from './validation';
import {
  REPERTOIRE_NAME_MAX,
  REPERTOIRE_PGN_MAX_BYTES,
  validateRepertoireImport,
  validateRepertoireLineEdit,
} from './validation';

export type CreateRepertoireResult = ActionResult<{ id: string }>;
export type DeleteRepertoireResult = ActionResult;

export type UpdateLineResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'notFound' | RepertoireLineEditError };

/**
 * Owner-only: replace a single line's name + moves. The line is addressed by
 * its 1-based number (seq + 1); its root position is fixed (editing changes the
 * moves only). Position-keyed annotations / comments are not touched — they
 * follow the surviving positions automatically.
 */
export async function updateRepertoireLine(params: {
  repertoireId: string;
  lineNo: number;
  viewerId: string;
  name: string | null;
  pgn: string;
}): Promise<UpdateLineResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [line] = await db
    .select({ id: repertoireLines.id, startingFen: repertoireLines.startingFen })
    .from(repertoireLines)
    .where(
      and(
        eq(repertoireLines.repertoireId, params.repertoireId),
        eq(repertoireLines.seq, params.lineNo - 1),
        isNull(repertoireLines.deletedAt)
      )
    )
    .limit(1);
  if (!line) return { ok: false, error: 'notFound' };

  const validated = validateRepertoireLineEdit({
    name: params.name,
    pgn: params.pgn,
    startingFen: line.startingFen,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  await db
    .update(repertoireLines)
    .set({ name: validated.data.name, pgn: validated.data.pgn })
    .where(eq(repertoireLines.id, line.id));

  return { ok: true };
}

export type AddLineResult =
  | { ok: true; lineNo: number }
  | { ok: false; error: 'unauthorized' | 'notFound' | RepertoireLineEditError };

/**
 * Owner-only: append a new line to an existing repertoire, at the repertoire's
 * fixed root position (`repertoires.starting_fen`) — a differently-rooted line
 * belongs to a different repertoire, not this one. Reuses
 * `validateRepertoireLineEdit` (same shape as editing a line: name + moves
 * against a fixed root), just an INSERT with the next `seq` instead of an
 * UPDATE of an existing row.
 *
 * The max-seq read + insert run in one transaction so two concurrent adds
 * can't compute the same `seq` (ordering only — `seq` has no unique
 * constraint, so a collision would misorder lines rather than fail).
 */
export async function addRepertoireLine(params: {
  repertoireId: string;
  viewerId: string;
  name: string | null;
  pgn: string;
}): Promise<AddLineResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [repertoire] = await db
    .select({ startingFen: repertoires.startingFen })
    .from(repertoires)
    .where(eq(repertoires.id, params.repertoireId))
    .limit(1);
  if (!repertoire) return { ok: false, error: 'notFound' };

  const validated = validateRepertoireLineEdit({
    name: params.name,
    pgn: params.pgn,
    startingFen: repertoire.startingFen,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  const seq = await db.transaction(async (tx) => {
    const [{ maxSeq }] = await tx
      .select({ maxSeq: sql<number>`coalesce(max(${repertoireLines.seq}), -1)` })
      .from(repertoireLines)
      .where(
        and(
          eq(repertoireLines.repertoireId, params.repertoireId),
          isNull(repertoireLines.deletedAt)
        )
      );
    const nextSeq = maxSeq + 1;
    await tx.insert(repertoireLines).values({
      repertoireId: params.repertoireId,
      pgn: validated.data.pgn,
      startingFen: repertoire.startingFen,
      name: validated.data.name,
      seq: nextSeq,
    });
    return nextSeq;
  });

  return { ok: true, lineNo: seq + 1 };
}

export type UpdateRepertoireResult =
  | { ok: true; name: string }
  | {
      ok: false;
      error: 'unauthorized' | 'notFound' | 'nameRequired' | 'nameTooLong' | 'invalidSide';
    };

/** The transaction handle drizzle hands to a `db.transaction` callback. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type OpeningLinks = { repertoireId: string; phase: RepertoirePhase; openingIds: string[] };

/**
 * Link a repertoire to the openings it covers. Only an `opening`-phase
 * repertoire has links (the picker is hidden for the others, and both write
 * paths drop the ids for the same reason). The requested ids are deduped and
 * re-checked against the master, so a stale or forged id is dropped rather than
 * tripping the FK.
 */
async function insertOpeningLinks(tx: Tx, { repertoireId, phase, openingIds }: OpeningLinks) {
  const requested = phase === 'opening' ? [...new Set(openingIds)] : [];
  if (requested.length === 0) return;

  const valid = await tx
    .select({ id: chessOpenings.id })
    .from(chessOpenings)
    .where(inArray(chessOpenings.id, requested));
  if (valid.length === 0) return;

  await tx.insert(repertoireOpenings).values(valid.map((o) => ({ repertoireId, openingId: o.id })));
}

/**
 * Point an existing repertoire at a new set of openings. The links are a plain
 * n:n value with nothing hanging off them, so an edit replaces them wholesale.
 */
async function replaceOpeningLinks(tx: Tx, links: OpeningLinks) {
  await tx
    .delete(repertoireOpenings)
    .where(eq(repertoireOpenings.repertoireId, links.repertoireId));
  await insertOpeningLinks(tx, links);
}

/**
 * Owner-only: update a repertoire's title, side, and opening links.
 *
 * Deliberately narrower than the import form — phase / PGN are structural
 * (the lines, and every position-keyed annotation hanging off them, derive
 * from the PGN; phase also gates whether opening links apply at all), so
 * changing those is a re-import, not an edit. `side`, like the title and the
 * opening links, is pure metadata: it labels which colour the course is
 * written for but doesn't constrain the PGN tree (the board builder plays
 * both colours' moves and branches at any ply regardless of `side`), so
 * relabeling it after the fact can't desync anything else.
 */
export async function updateRepertoireDetails(params: {
  repertoireId: string;
  viewerId: string;
  name: string;
  side: RepertoireSide;
  openingIds: string[];
}): Promise<UpdateRepertoireResult> {
  const name = params.name.trim();
  if (!name) return { ok: false, error: 'nameRequired' };
  if (name.length > REPERTOIRE_NAME_MAX) return { ok: false, error: 'nameTooLong' };
  if (params.side !== 'white' && params.side !== 'black') {
    return { ok: false, error: 'invalidSide' };
  }

  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [row] = await db
    .select({ phase: repertoires.phase })
    .from(repertoires)
    .where(eq(repertoires.id, params.repertoireId))
    .limit(1);
  if (!row) return { ok: false, error: 'notFound' };

  await db.transaction(async (tx) => {
    await tx
      .update(repertoires)
      .set({ name, side: params.side })
      .where(eq(repertoires.id, params.repertoireId));
    await replaceOpeningLinks(tx, {
      repertoireId: params.repertoireId,
      phase: row.phase,
      openingIds: params.openingIds,
    });
  });

  return { ok: true, name };
}

export type UpdateRepertoireMovesResult =
  | { ok: true }
  | {
      ok: false;
      error: 'unauthorized' | 'notFound' | 'pgnRequired' | 'pgnTooLarge' | 'invalidPgn';
    };

/**
 * Owner-only: replace a repertoire's whole move tree from one
 * PGN-with-variations (the edit form's board serializes to it), re-decomposing
 * into lines like the import does — but as a DIFF against the existing rows,
 * so line identity survives editing:
 *
 * - a line whose move sequence is unchanged keeps its row (id + name),
 *   only its `seq` moving to the new enumeration order;
 * - a line no longer produced is soft-deleted;
 * - a new line is inserted at its enumeration position.
 *
 * The root is fixed (`repertoires.starting_fen`) — a differently-rooted PGN is
 * rejected, mirroring `addRepertoireLine`. Position-keyed annotations and
 * comments need no migration: they follow the surviving positions.
 */
export async function updateRepertoireLinesFromPgn(params: {
  repertoireId: string;
  viewerId: string;
  pgn: string;
}): Promise<UpdateRepertoireMovesResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [repertoire] = await db
    .select({ startingFen: repertoires.startingFen })
    .from(repertoires)
    .where(eq(repertoires.id, params.repertoireId))
    .limit(1);
  if (!repertoire) return { ok: false, error: 'notFound' };

  const pgn = params.pgn.trim();
  if (!pgn) return { ok: false, error: 'pgnRequired' };
  if (new TextEncoder().encode(pgn).length > REPERTOIRE_PGN_MAX_BYTES) {
    return { ok: false, error: 'pgnTooLarge' };
  }

  let tree: PgnTree;
  try {
    tree = parsePgnTree(pgn);
  } catch {
    return { ok: false, error: 'invalidPgn' };
  }
  if (tree.startingFen !== (repertoire.startingFen ?? getStartingFen())) {
    return { ok: false, error: 'invalidPgn' };
  }

  const nextPgns = enumerateLines(tree).map((moves) =>
    generatePgn(moves, repertoire.startingFen ?? undefined)
  );

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: repertoireLines.id, pgn: repertoireLines.pgn, seq: repertoireLines.seq })
      .from(repertoireLines)
      .where(
        and(
          eq(repertoireLines.repertoireId, params.repertoireId),
          isNull(repertoireLines.deletedAt)
        )
      );

    // Both sides are generatePgn output, so string equality IS line equality.
    // Grouped into queues so duplicate lines (possible in a hand-built tree)
    // match one-to-one instead of all claiming the same row.
    const pool = new Map<string, { id: string; seq: number }[]>();
    for (const row of existing) {
      const queue = pool.get(row.pgn) ?? [];
      queue.push({ id: row.id, seq: row.seq });
      pool.set(row.pgn, queue);
    }

    const matched = new Set<string>();
    for (const [index, linePgn] of nextPgns.entries()) {
      const row = pool.get(linePgn)?.shift();
      if (row) {
        matched.add(row.id);
        if (row.seq !== index) {
          await tx
            .update(repertoireLines)
            .set({ seq: index })
            .where(eq(repertoireLines.id, row.id));
        }
      } else {
        await tx.insert(repertoireLines).values({
          repertoireId: params.repertoireId,
          pgn: linePgn,
          startingFen: repertoire.startingFen,
          seq: index,
        });
      }
    }

    const removed = existing.filter((row) => !matched.has(row.id));
    if (removed.length > 0) {
      await tx
        .update(repertoireLines)
        .set({ deletedAt: new Date() })
        .where(
          inArray(
            repertoireLines.id,
            removed.map((row) => row.id)
          )
        );
    }
  });

  return { ok: true };
}

/**
 * Create a repertoire (型) for the authenticated user, decomposing the imported
 * PGN into one `repertoire_lines` row per line. Repertoire + lines are inserted
 * in a single transaction; `userId` comes from the session.
 */
export async function createRepertoireEntry(
  input: RepertoireImportInput
): Promise<CreateRepertoireResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.createRepertoire);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const validated = validateRepertoireImport(input);
  if (!validated.ok) return { error: validated.error };
  const { name, side, phase, description, startingFen, lines, annotations } = validated.data;

  const id = await db.transaction(async (tx) => {
    const [repertoire] = await tx
      .insert(repertoires)
      .values({ userId: user.id, name, side, phase, description, startingFen })
      .returning({ id: repertoires.id });

    await tx.insert(repertoireLines).values(
      lines.map((line, index) => ({
        repertoireId: repertoire.id,
        pgn: line.pgn,
        startingFen: line.startingFen,
        seq: index,
      }))
    );

    // Board-authored "why this move" notes and arrow/circle markup land with
    // the kata, under the same position keys the detail page writes to later.
    // An absent half keeps its column default (empty note / no markup).
    if (annotations.length > 0) {
      await tx.insert(repertoireAnnotations).values(
        annotations.map(({ positionKey, text, shapes }) => ({
          repertoireId: repertoire.id,
          positionKey,
          ...(text !== undefined ? { text } : {}),
          ...(shapes !== undefined ? { shapes } : {}),
        }))
      );
    }

    await insertOpeningLinks(tx, {
      repertoireId: repertoire.id,
      phase,
      openingIds: input.openingIds ?? [],
    });

    return repertoire.id;
  });

  return { success: true, id };
}

/**
 * Soft-delete a repertoire (stamp `deleted_at`); its lines cascade-hide behind
 * the parent in reads. Owner- and live-scoped via the WHERE clause, so a
 * re-delete or another user's id is a no-op → `notFound`.
 */
export async function deleteRepertoireEntry(id: string): Promise<DeleteRepertoireResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.deleteRepertoire);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const deleted = await db
    .update(repertoires)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(repertoires.id, id), eq(repertoires.userId, user.id), isNull(repertoires.deletedAt))
    )
    .returning({ id: repertoires.id });

  if (deleted.length === 0) return { error: 'notFound' };
  return { success: true };
}

export type PublishRepertoireResult = ActionResult;

/**
 * Owner-only: publish a `building` repertoire (→ `public`), stamping
 * `publishedAt`. One-way — there is no action that moves a repertoire back to
 * `building`; see the `status` TSDoc on the schema. Requires at least one
 * live line, so an emptied-out course can't be published as an empty shell.
 */
export async function publishRepertoireEntry(id: string): Promise<PublishRepertoireResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.publishRepertoire);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const ownerError = await assertRepertoireOwner(id, user.id);
  if (ownerError) return { error: ownerError };

  const [repertoire] = await db
    .select({ status: repertoires.status })
    .from(repertoires)
    .where(and(eq(repertoires.id, id), isNull(repertoires.deletedAt)))
    .limit(1);
  if (!repertoire) return { error: 'notFound' };
  if (repertoire.status !== 'building') return { error: 'alreadyPublished' };

  const lineCount = await countRows(
    repertoireLines,
    and(eq(repertoireLines.repertoireId, id), isNull(repertoireLines.deletedAt))
  );
  if (lineCount < 1) return { error: 'noLines' };

  await db
    .update(repertoires)
    .set({ status: 'public', publishedAt: new Date() })
    .where(eq(repertoires.id, id));

  return { success: true };
}
