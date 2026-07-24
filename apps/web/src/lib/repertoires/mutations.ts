import { toPositionKey } from '@blindfold-chess/features/chess-core';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

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
import type { RepertoireVisibility } from '@/lib/points';
import {
  chargeRepertoireVisibility,
  clawbackPointsForPost,
  grantPointsForPost,
} from '@/lib/points';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import { assertRepertoireOwner } from './queries';
import { replayRepertoireLine } from './replay-line';
import type {
  RepertoireImportInput,
  RepertoireLineEditError,
  RepertoirePhase,
  RepertoireSide,
} from './validation';
import {
  REPERTOIRE_DESCRIPTION_MAX,
  REPERTOIRE_NAME_MAX,
  validateRepertoireImport,
  validateRepertoireLineEdit,
} from './validation';

export type CreateRepertoireResult = ActionResult<{ id: string }>;
export type DeleteRepertoireResult = ActionResult;

export type UpdateLineResult =
  { ok: true } | { ok: false; error: 'unauthorized' | 'notFound' | RepertoireLineEditError };

/**
 * Delete every annotation of a repertoire whose position no longer appears in
 * ANY of its live lines — the "collect unused notes" step run after a
 * structural line change (a line edit that shortens/rewrites moves, or a line
 * delete).
 *
 * Reachability is a REPERTOIRE-WIDE question, not a per-line one: annotations
 * are keyed by `(repertoire, positionKey)` and shared across transposing lines
 * (see `upsertAnnotation`), so a position dropped from the edited line may still
 * be reached by a sibling line. We therefore replay every live line, union
 * their position keys, and prune only annotations outside that set.
 *
 * Conservative on unparseable input: if a live line's PGN fails to replay we
 * can't account for the positions it "owns", so we skip pruning entirely rather
 * than risk deleting a note that line still reaches. (Live lines always carry
 * movetext — an empty replay for a non-empty PGN means a parse failure.)
 *
 * Runs inside the caller's transaction so the reachable set reflects the same
 * post-mutation line state the prune deletes against.
 */
async function pruneOrphanAnnotations(tx: Tx, repertoireId: string): Promise<void> {
  const lines = await tx
    .select({ pgn: repertoireLines.pgn, startingFen: repertoireLines.startingFen })
    .from(repertoireLines)
    .where(and(eq(repertoireLines.repertoireId, repertoireId), isNull(repertoireLines.deletedAt)));

  const reachable = new Set<string>();
  for (const line of lines) {
    const { sans, positions } = replayRepertoireLine(line);
    const hasMovetext = line.pgn.replace(/\[[^\]]*\]/g, '').trim().length > 0;
    if (sans.length === 0 && hasMovetext) return; // parse failure — bail, don't prune
    for (const pos of positions) reachable.add(toPositionKey(pos.fen));
  }

  const existing = await tx
    .select({ positionKey: repertoireAnnotations.positionKey })
    .from(repertoireAnnotations)
    .where(eq(repertoireAnnotations.repertoireId, repertoireId));
  const orphanKeys = existing.map((row) => row.positionKey).filter((key) => !reachable.has(key));
  if (orphanKeys.length > 0) {
    await tx
      .delete(repertoireAnnotations)
      .where(
        and(
          eq(repertoireAnnotations.repertoireId, repertoireId),
          inArray(repertoireAnnotations.positionKey, orphanKeys)
        )
      );
  }
}

/**
 * Owner-only: replace a single line's name + moves. The line is addressed by
 * its 1-based number (seq + 1); its root position is fixed (editing changes the
 * moves only). Position-keyed annotations / comments follow the surviving
 * positions automatically — and any note left attached to no line at all (a
 * position this edit removed and no sibling line reaches) is pruned in the same
 * transaction (see {@link pruneOrphanAnnotations}).
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

  await db.transaction(async (tx) => {
    await tx
      .update(repertoireLines)
      .set({ name: validated.data.name, pgn: validated.data.pgn })
      .where(eq(repertoireLines.id, line.id));
    await pruneOrphanAnnotations(tx, params.repertoireId);
  });

  return { ok: true };
}

export type DeleteLineResult = { ok: true } | { ok: false; error: 'unauthorized' | 'notFound' };

/**
 * Owner-only: soft-delete a single line, addressed by its 1-based number
 * (seq + 1). The surviving lines are repacked to a dense `0..n-1` `seq` so line
 * numbers stay contiguous (the same invariant the import / whole-tree paths
 * keep), and any note left attached to no remaining line is pruned — all in one
 * transaction (see {@link pruneOrphanAnnotations}). Deleting the last line
 * leaves an empty (still `building`-publishable-once-refilled) repertoire, the
 * same reachable-by-URL empty state the viewer already handles.
 */
export async function deleteRepertoireLine(params: {
  repertoireId: string;
  lineNo: number;
  viewerId: string;
}): Promise<DeleteLineResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [line] = await db
    .select({ id: repertoireLines.id })
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

  await db.transaction(async (tx) => {
    await tx
      .update(repertoireLines)
      .set({ deletedAt: new Date() })
      .where(eq(repertoireLines.id, line.id));

    // Repack the survivors to a gapless seq so "Line N" labels / URLs stay
    // contiguous after the hole this delete left.
    const remaining = await tx
      .select({ id: repertoireLines.id, seq: repertoireLines.seq })
      .from(repertoireLines)
      .where(
        and(
          eq(repertoireLines.repertoireId, params.repertoireId),
          isNull(repertoireLines.deletedAt)
        )
      )
      .orderBy(asc(repertoireLines.seq));
    for (const [index, row] of remaining.entries()) {
      if (row.seq !== index) {
        await tx.update(repertoireLines).set({ seq: index }).where(eq(repertoireLines.id, row.id));
      }
    }

    await pruneOrphanAnnotations(tx, params.repertoireId);
  });

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
      error:
        | 'unauthorized'
        | 'notFound'
        | 'nameRequired'
        | 'nameTooLong'
        | 'descriptionTooLong'
        | 'invalidSide';
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
  /** Course-level blurb; trimmed to null when blank. */
  description: string | null;
  openingIds: string[];
}): Promise<UpdateRepertoireResult> {
  const name = params.name.trim();
  if (!name) return { ok: false, error: 'nameRequired' };
  if (name.length > REPERTOIRE_NAME_MAX) return { ok: false, error: 'nameTooLong' };
  if (params.side !== 'white' && params.side !== 'black') {
    return { ok: false, error: 'invalidSide' };
  }
  const description = params.description?.trim() || null;
  if (description && description.length > REPERTOIRE_DESCRIPTION_MAX) {
    return { ok: false, error: 'descriptionTooLong' };
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
      .set({ name, side: params.side, description })
      .where(eq(repertoires.id, params.repertoireId));
    await replaceOpeningLinks(tx, {
      repertoireId: params.repertoireId,
      phase: row.phase,
      openingIds: params.openingIds,
    });
  });

  return { ok: true, name };
}

/**
 * Create a repertoire (型) for the authenticated user, decomposing the imported
 * PGN into one `repertoire_lines` row per line, and publish it at the chosen
 * visibility in the same transaction — the /new flow is create-and-publish, not
 * the old two-step draft-then-publish. `userId` comes from the session.
 *
 * @design Visibility + coins on create
 *
 * The row is inserted directly at `input.visibility` (default `public`), not
 * `building`: a fresh import already has ≥1 line, so there is nothing to draft.
 *   - `public` (free): stamp `publishedAt`, grant the UGC coin (idempotent,
 *     daily-capped) — identical to the old `publishRepertoireEntry` reward.
 *   - `followers_only` / `private`: charge the tier price via
 *     `chargeRepertoireVisibility` (first unlock, so the full price). If the
 *     wallet can't cover it the whole transaction rolls back — no orphaned
 *     course, no partial charge — and the action returns `insufficient_balance`.
 *     No publish reward: a non-public course is not a public contribution, and
 *     `publishedAt` stays null until it ever becomes public.
 */
export async function createRepertoireEntry(
  input: RepertoireImportInput
): Promise<CreateRepertoireResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.createRepertoire);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const validated = validateRepertoireImport(input);
  if (!validated.ok) return { error: validated.error };
  const { name, side, phase, description, visibility, startingFen, lines, annotations } =
    validated.data;

  const result = await db.transaction(
    async (tx): Promise<{ ok: true; id: string } | { ok: false }> => {
      const [repertoire] = await tx
        .insert(repertoires)
        .values({
          userId: user.id,
          name,
          side,
          phase,
          description,
          startingFen,
          status: visibility,
          publishedAt: visibility === 'public' ? new Date() : null,
        })
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

      if (visibility === 'public') {
        // Same reward the old building→public publish gave.
        await grantPointsForPost(tx, user.id, { type: 'repertoire', id: repertoire.id });
      } else {
        const charge = await chargeRepertoireVisibility(tx, {
          userId: user.id,
          repertoireId: repertoire.id,
          target: visibility,
        });
        if (!charge.ok) return { ok: false };
      }

      return { ok: true, id: repertoire.id };
    }
  );

  if (!result.ok) return { error: 'insufficient_balance' };
  return { success: true, id: result.id };
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

  const deleted = await db.transaction(async (tx) => {
    const rows = await tx
      .update(repertoires)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(repertoires.id, id), eq(repertoires.userId, user.id), isNull(repertoires.deletedAt))
      )
      .returning({ id: repertoires.id });

    if (rows.length === 0) return rows;

    // Reverse the publish reward when the course is removed — a no-op for a
    // never-published (`building`) repertoire, since no grant row exists, and
    // capped at the author's live `earned` balance (already-spent coins stay).
    await clawbackPointsForPost(tx, user.id, { type: 'repertoire', id });
    return rows;
  });

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

  await db.transaction(async (tx) => {
    await tx
      .update(repertoires)
      .set({ status: 'public', publishedAt: new Date() })
      .where(eq(repertoires.id, id));

    // Reward the public contribution — immediately spendable, clamped to the
    // shared daily creation cap. Idempotent per (source, id): the `building`
    // guard above already blocks a second publish, and the ledger's UNIQUE
    // idempotency key is the hard backstop.
    await grantPointsForPost(tx, user.id, { type: 'repertoire', id });
  });

  return { success: true };
}

export type ChangeRepertoireVisibilityResult = ActionResult<{
  status: RepertoireVisibility;
  /** Coins actually charged for this change (0 when the tier was already paid). */
  charged: number;
}>;

/**
 * Owner-only: move a repertoire among the coin-gated visibility tiers
 * (`public` / `followers_only` / `private`). Unlike publishing, this is NOT
 * one-way — the owner can flip freely. Coins are charged only for the
 * INCREMENT above the highest tier ever paid for this repertoire (see
 * `chargeRepertoireVisibility`), so unlocking `private` once then toggling
 * `public ↔ private` later is free.
 *
 * @design Points reward: granted once, on becoming public; never clawed back
 *
 * `public` is the only tier that is a public contribution, so only it earns
 * the UGC coin (idempotent per source/id → at most once per repertoire ever).
 * Moving OUT of public to a paid tier does not reverse the grant: the
 * contribution was made, re-toggling can't re-earn (idempotent), and the paid
 * tier already cost more coins than the 1-coin reward — so there is nothing to
 * farm and a clawback would only be punitive.
 *
 * `publishedAt` is stamped on the first move to `public` (for the catalog's
 * "newest" sort) and left untouched afterwards. Requires ≥1 live line, same
 * bar as `publishRepertoireEntry` — a paid tier gates viewing a finished
 * course, and an empty shell has nothing to gate.
 */
export async function changeRepertoireVisibility(params: {
  repertoireId: string;
  target: RepertoireVisibility;
}): Promise<ChangeRepertoireVisibilityResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.changeRepertoireVisibility);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const ownerError = await assertRepertoireOwner(params.repertoireId, user.id);
  if (ownerError) return { error: ownerError };

  const [repertoire] = await db
    .select({ status: repertoires.status, publishedAt: repertoires.publishedAt })
    .from(repertoires)
    .where(and(eq(repertoires.id, params.repertoireId), isNull(repertoires.deletedAt)))
    .limit(1);
  if (!repertoire) return { error: 'notFound' };

  // Re-selecting the current tier is a free no-op — no charge, no write.
  if (repertoire.status === params.target) {
    return { success: true, status: params.target, charged: 0 };
  }

  const lineCount = await countRows(
    repertoireLines,
    and(eq(repertoireLines.repertoireId, params.repertoireId), isNull(repertoireLines.deletedAt))
  );
  if (lineCount < 1) return { error: 'noLines' };

  const outcome = await db.transaction(
    async (tx): Promise<{ ok: false } | { ok: true; charged: number }> => {
      const charge = await chargeRepertoireVisibility(tx, {
        userId: user.id,
        repertoireId: params.repertoireId,
        target: params.target,
      });
      if (!charge.ok) return { ok: false };

      const publishedAt =
        params.target === 'public' && repertoire.publishedAt == null
          ? new Date()
          : repertoire.publishedAt;

      await tx
        .update(repertoires)
        .set({ status: params.target, publishedAt })
        .where(eq(repertoires.id, params.repertoireId));

      if (params.target === 'public') {
        await grantPointsForPost(tx, user.id, { type: 'repertoire', id: params.repertoireId });
      }

      return { ok: true, charged: charge.charged };
    }
  );

  if (!outcome.ok) return { error: 'insufficient_balance' };
  return { success: true, status: params.target, charged: outcome.charged };
}
