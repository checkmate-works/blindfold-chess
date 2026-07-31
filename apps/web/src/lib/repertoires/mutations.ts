import { toPositionKey } from '@blindfold-chess/features/chess-core';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import {
  chessOpenings,
  db,
  repertoireAnnotations,
  repertoireChapters,
  repertoireLines,
  repertoireOpenings,
  repertoires,
} from '@/lib/db';
import { countRows } from '@/lib/db/list-query';
import type { DbTx } from '@/lib/db/types';
import type { RepertoireVisibility } from '@/lib/points';
import {
  chargeRepertoireVisibility,
  clawbackPointsForPost,
  grantPointsForPost,
} from '@/lib/points';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import type { ArrangementError, ArrangementItem } from './line-order';
import { NEW_CHAPTER_KEY_PREFIX, resolveArrangement, validateArrangement } from './line-order';
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
 * "The lines this repertoire still has" — the live-rows predicate every line
 * query in this module shares. Soft-deleted rows are excluded everywhere: a
 * deleted line is gone as far as line numbering, annotation reachability and the
 * publish/visibility line-count bar are concerned.
 */
function liveLinesOf(repertoireId: string) {
  return and(eq(repertoireLines.repertoireId, repertoireId), isNull(repertoireLines.deletedAt));
}

/**
 * Load one live line by its stable number (`line_no`, the form that appears in
 * URLs and "Line N" labels), or undefined when the repertoire has no such line.
 *
 * Returns a single superset of columns rather than a per-caller column list —
 * same posture as `ownedPositionColumns` in `lib/positions/user-position-mutations`:
 * the edit path needs the root FEN to validate against, the delete path needs
 * only the id, and one shape keeps the lookup in one place.
 */
async function loadLiveLineByNo(repertoireId: string, lineNo: number) {
  const [line] = await db
    .select({ id: repertoireLines.id, startingFen: repertoireLines.startingFen })
    .from(repertoireLines)
    .where(and(liveLinesOf(repertoireId), eq(repertoireLines.lineNo, lineNo)))
    .limit(1);
  return line;
}

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
async function pruneOrphanAnnotations(tx: DbTx, repertoireId: string): Promise<void> {
  const lines = await tx
    .select({ pgn: repertoireLines.pgn, startingFen: repertoireLines.startingFen })
    .from(repertoireLines)
    .where(liveLinesOf(repertoireId));

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
 * its stable `line_no`; its root position is fixed (editing changes the
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

  const line = await loadLiveLineByNo(params.repertoireId, params.lineNo);
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
 * Owner-only: soft-delete a single line, addressed by its stable `line_no`, and
 * prune any note left attached to no remaining line — both in one transaction
 * (see {@link pruneOrphanAnnotations}). Deleting the last line leaves an empty
 * (still `building`-publishable-once-refilled) repertoire, the same
 * reachable-by-URL empty state the viewer already handles.
 *
 * Nothing is renumbered. `line_no` is deliberately left with a hole where the
 * deleted line was: the surviving lines keep the URLs they were linked to and
 * discussed under, and the hole 404s instead of quietly resolving to whichever
 * line moved up. (Until 2026-07-31 this repacked `seq` to stay gapless, which —
 * back when the URL was `seq + 1` — shifted every later line's URL onto
 * different moves.) `seq` also keeps its hole; it is an ordering key, and
 * `ORDER BY` does not care about gaps.
 */
export async function deleteRepertoireLine(params: {
  repertoireId: string;
  lineNo: number;
  viewerId: string;
}): Promise<DeleteLineResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const line = await loadLiveLineByNo(params.repertoireId, params.lineNo);
  if (!line) return { ok: false, error: 'notFound' };

  await db.transaction(async (tx) => {
    await tx
      .update(repertoireLines)
      .set({ deletedAt: new Date() })
      .where(eq(repertoireLines.id, line.id));

    await pruneOrphanAnnotations(tx, params.repertoireId);
  });

  return { ok: true };
}

export type SaveArrangementResult =
  { ok: true } | { ok: false; error: 'unauthorized' | 'notFound' | ArrangementError };

/**
 * Owner-only: commit the whole arrangement of a repertoire's lines — their
 * chapters, which chapter each line sits in, and the order within each — from
 * the single flat list the arrange page presents. One call, because on that
 * page they are one edit: dragging a line under a different heading changes its
 * chapter and its position in the same gesture, and there is no coherent
 * half of that to save on its own.
 *
 * Only `seq` and `chapter_id` move on a line. `line_no` — the URL and the
 * "Line N" label — is untouched by design (see the `@design` note on the
 * schema), so arranging never rewrites a link anyone has saved, shared, or
 * commented under. An arranged list therefore reads "Line 3, Line 1, Line 2",
 * which is the honest rendering: the number identifies the line, the position
 * is the owner's arrangement.
 *
 * Write order inside the transaction is load-bearing:
 *   1. insert chapters the client invented, so lines have something to point at
 *   2. rename / reorder the chapters that survive
 *   3. re-file every line
 *   4. only then delete the chapters that were dropped from the list
 * Step 4 last because the composite FK is NO ACTION, not SET NULL (see the
 * schema): a chapter still holding lines cannot be deleted, and step 3 is what
 * empties it.
 */
export async function saveRepertoireArrangement(params: {
  repertoireId: string;
  viewerId: string;
  items: ArrangementItem[];
}): Promise<SaveArrangementResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [liveLines, liveChapters] = await Promise.all([
    db
      .select({ lineNo: repertoireLines.lineNo })
      .from(repertoireLines)
      .where(liveLinesOf(params.repertoireId)),
    db
      .select({ id: repertoireChapters.id })
      .from(repertoireChapters)
      .where(eq(repertoireChapters.repertoireId, params.repertoireId)),
  ]);

  const invalid = validateArrangement(
    params.items,
    liveLines.map((row) => row.lineNo),
    liveChapters.map((row) => row.id)
  );
  if (invalid) return { ok: false, error: invalid };

  const resolved = resolveArrangement(params.items);
  const keptChapterKeys = new Set(resolved.chapters.map((chapter) => chapter.key));
  const removedChapterIds = liveChapters
    .map((row) => row.id)
    .filter((id) => !keptChapterKeys.has(id));

  await db.transaction(async (tx) => {
    // 1. New chapters. Their ids are generated here, never accepted from the
    //    client, so a request can't claim an id belonging to another course.
    const chapterIdByKey = new Map<string, string>();
    for (const chapter of resolved.chapters) {
      if (!chapter.key.startsWith(NEW_CHAPTER_KEY_PREFIX)) {
        chapterIdByKey.set(chapter.key, chapter.key);
        continue;
      }
      const [inserted] = await tx
        .insert(repertoireChapters)
        .values({ repertoireId: params.repertoireId, name: chapter.name, seq: chapter.seq })
        .returning({ id: repertoireChapters.id });
      chapterIdByKey.set(chapter.key, inserted.id);
    }

    // 2. Surviving chapters: name and position.
    for (const chapter of resolved.chapters) {
      if (chapter.key.startsWith(NEW_CHAPTER_KEY_PREFIX)) continue;
      await tx
        .update(repertoireChapters)
        .set({ name: chapter.name, seq: chapter.seq })
        .where(
          and(
            eq(repertoireChapters.id, chapter.key),
            eq(repertoireChapters.repertoireId, params.repertoireId)
          )
        );
    }

    // 3. Every line's chapter and its order within it.
    for (const line of resolved.lines) {
      await tx
        .update(repertoireLines)
        .set({
          chapterId:
            line.chapterKey === null ? null : (chapterIdByKey.get(line.chapterKey) ?? null),
          seq: line.seq,
        })
        .where(and(liveLinesOf(params.repertoireId), eq(repertoireLines.lineNo, line.lineNo)));
    }

    // 4. Chapters the owner removed. Empty by now, thanks to step 3.
    if (removedChapterIds.length > 0) {
      await tx
        .delete(repertoireChapters)
        .where(
          and(
            eq(repertoireChapters.repertoireId, params.repertoireId),
            inArray(repertoireChapters.id, removedChapterIds)
          )
        );
    }
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
 * against a fixed root), just an INSERT at the end of the list instead of an
 * UPDATE of an existing row.
 *
 * The new row takes the next `seq` among LIVE lines (append to the display
 * order) but the next `line_no` across ALL of them, soft-deleted included: a
 * number that has been used once is retired with its line, so a URL that
 * pointed at deleted moves stays a 404 instead of coming back as a different
 * line. Both maxima are read inside the insert's transaction, so two concurrent
 * adds can't land on the same values — and for `line_no` a race is a failed
 * insert (UNIQUE `uq_repertoire_line_no`) rather than a silent duplicate.
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

  const lineNo = await db.transaction(async (tx) => {
    const [{ maxSeq }] = await tx
      .select({ maxSeq: sql<number>`coalesce(max(${repertoireLines.seq}), -1)` })
      .from(repertoireLines)
      .where(liveLinesOf(params.repertoireId));
    // Deliberately NOT scoped to live rows — see the TSDoc above.
    const [{ maxLineNo }] = await tx
      .select({ maxLineNo: sql<number>`coalesce(max(${repertoireLines.lineNo}), 0)` })
      .from(repertoireLines)
      .where(eq(repertoireLines.repertoireId, params.repertoireId));
    const nextLineNo = maxLineNo + 1;
    await tx.insert(repertoireLines).values({
      repertoireId: params.repertoireId,
      pgn: validated.data.pgn,
      startingFen: repertoire.startingFen,
      name: validated.data.name,
      lineNo: nextLineNo,
      seq: maxSeq + 1,
    });
    return nextLineNo;
  });

  return { ok: true, lineNo };
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

type OpeningLinks = { repertoireId: string; phase: RepertoirePhase; openingIds: string[] };

/**
 * Link a repertoire to the openings it covers. Only an `opening`-phase
 * repertoire has links (the picker is hidden for the others, and both write
 * paths drop the ids for the same reason). The requested ids are deduped and
 * re-checked against the master, so a stale or forged id is dropped rather than
 * tripping the FK.
 */
async function insertOpeningLinks(tx: DbTx, { repertoireId, phase, openingIds }: OpeningLinks) {
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
async function replaceOpeningLinks(tx: DbTx, links: OpeningLinks) {
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
          lineNo: index + 1,
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

  const lineCount = await countRows(repertoireLines, liveLinesOf(id));
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

  const lineCount = await countRows(repertoireLines, liveLinesOf(params.repertoireId));
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
