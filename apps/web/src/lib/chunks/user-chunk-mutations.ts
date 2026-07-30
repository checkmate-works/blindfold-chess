import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { chunkFeedbackTopics, chunks, db, feedItems, topicPosts } from '@/lib/db';
import { diffFields } from '@/lib/db/diff-fields';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { linkNewChunkToGameMove } from '@/lib/db/game-chunks';
import { clawbackPointsForPost, grantPointsForPost } from '@/lib/points';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import { dispatchChunkEvent } from './chunk-event-handlers';
import { autoRejectPendingEditRequests, loadOwnedChunk } from './chunk-mutation-guards';
import { buildChunkCreateValues, buildChunkUpdateValues } from './mutation-helpers';
import { findChunkBySlug } from './queries';
import type { ChunkFeedbackTopic, ChunkMutationData } from './validation';
import { validateChunkMutationData } from './validation';

type ChunkFeedbackTopicTx = {
  delete: typeof db.delete;
  insert: typeof db.insert;
};

/**
 * Reset the `chunk_feedback_topics` rows for a chunk to exactly
 * `topics`. Idempotent and order-independent: DELETE all current rows
 * for the chunk, then INSERT the new set (if non-empty). Skipping the
 * insert when `topics` is empty avoids a no-op multi-VALUES INSERT.
 *
 * Lives at the mutation-layer level (rather than as a tx-aware helper
 * in `queries.ts`) because the reset semantics are write-only and
 * coupled to the create / update / publish call sites.
 */
async function resetChunkFeedbackTopics(
  tx: ChunkFeedbackTopicTx,
  chunkId: string,
  topics: readonly ChunkFeedbackTopic[]
) {
  await tx.delete(chunkFeedbackTopics).where(eq(chunkFeedbackTopics.chunkId, chunkId));
  if (topics.length > 0) {
    await tx.insert(chunkFeedbackTopics).values(topics.map((topic) => ({ chunkId, topic })));
  }
}

/**
 * UX preflight for slug availability, shared by the create path and the
 * draft-only rename path in `updateChunkEntry`. Preflight only: the DB
 * UNIQUE on `chunks.slug` is the canonical guarantee, and both write paths
 * additionally translate PG 23505 into `slugTaken` to close the preflight →
 * write race window. `findChunkBySlug` returns soft-deleted rows too,
 * matching the column constraint (the unique index has no
 * `WHERE deleted_at IS NULL` clause — once minted, a slug is permanently
 * reserved).
 */
async function isSlugTaken(slug: string): Promise<boolean> {
  return !!(await findChunkBySlug(slug));
}

/**
 * Shared core for the user-facing `chunks` CRUD Server Actions. Mirrors the
 * shape of `lib/positions/user-position-mutations.ts` — same auth + ban +
 * rate-limit guard, ownership / soft-delete checks, in-transaction writes,
 * point grant / clawback, activity log, and revalidation — minus the
 * positions-specific concerns (no fork lineage, no type discriminator,
 * no follower notifications since chunks are a catalog and not a feed
 * entity). Each public Server Action under `/chunks/_actions/` is a thin
 * async wrapper that supplies its rate-limit rule and a typed payload.
 *
 * @design Slug immutability
 * The slug is set at creation and never updated. Slugs become public
 * catalog URLs (`/chunks/<slug>`) and also serve as `topic_posts.topic_key`
 * for the chunk's discussion thread, so they are treated as permanent
 * identifiers on published chunks. `buildChunkUpdateValues` omits the
 * slug column when the caller forwards no value, so a UI that accidentally
 * drops slug from its payload cannot silently mutate it; the drafts-only
 * rename path inside `updateChunkEntry` opts back in by explicitly passing
 * the new slug.
 *
 * @design Slug collisions
 * `chunks.slug` is UNIQUE at the DB level, and the constraint does NOT
 * exclude soft-deleted rows — once minted, a slug is permanently reserved.
 * The create path runs `findChunkBySlug` as a UX preflight and ALSO
 * catches PG error code `23505` from the INSERT to close the preflight →
 * INSERT race window. Both surface as `{ error: 'slugTaken' }`.
 */

/**
 * Optional side-effects the UGC create path performs alongside the row
 * insert. Kept out of `ChunkMutationData` because it is not chunk column
 * data — the admin create path shares that payload type and has no notion
 * of a game move.
 */
export type CreateChunkOptions = {
  /**
   * Game move to link the new chunk to, in the same transaction ("create a
   * chunk from this position"). Silently skipped when the chunk turns out
   * not to be linkable by this author — see `createChunkEntry`.
   */
  linkTarget?: { gameId: string; ply: number };
};

export type CreateChunkResult =
  | {
      success: true;
      id: string;
      slug: string;
      /**
       * True when `options.linkTarget` was supplied AND the link landed.
       * Lets the caller send the author back to the game move instead of
       * the new chunk's page, without guessing whether the link happened.
       */
      linkedToGame?: boolean;
      pointGrant?: { pointEventId: string; amount: number };
      /**
       * True when the daily creation cap limited the reward — either trimmed
       * it to a partial amount (also has `pointGrant`) or blocked it entirely
       * (no `pointGrant`, earned 0 today). Callers append `?coinsCapped=1`.
       */
      coinCapped?: boolean;
    }
  | { error: string };

export type UpdateChunkResult = ActionResult;

export type DeleteChunkResult = ActionResult;

/**
 * @design the game link rides inside the create transaction
 * When the author came from a shared game's "create a chunk from this
 * position", the resulting chunk is linked back to that move here rather
 * than by a follow-up call from the client. Two reasons: a chunk that
 * silently fails to link would strand the author on the new chunk's page
 * with the link left as manual homework (the exact dead end this flow
 * exists to remove), and a second round-trip could be lost to a navigation
 * between the two writes.
 *
 * The link is best-effort in one specific sense: `insertGameChunk` uses
 * `onConflictDoNothing`, and the eligibility re-check can legitimately say
 * no (a game that vanished, or someone hand-editing `?game=` to a chunk
 * they may not link). Neither aborts the create — the chunk is what the
 * author asked for; the link is the convenience. `linkedToGame` reports
 * which happened so the caller can route accordingly.
 */
export async function createChunkEntry(
  data: ChunkMutationData,
  options?: CreateChunkOptions
): Promise<CreateChunkResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.createChunk);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  // The validation API still expects `userId` in the payload (shared with
  // the admin path, which lets admins type any UUID). For the UGC entry
  // point we always overwrite it with the authenticated user — never trust
  // a client-supplied userId here.
  const dataWithAuthor: ChunkMutationData = { ...data, userId: user.id };

  const validationError = validateChunkMutationData(dataWithAuthor, 'create');
  if (validationError) {
    return { error: validationError };
  }

  // Publishing on creation must satisfy the same description-required rule
  // as the draft→published transition in `publishChunkEntry`. Without this
  // guard a chunk created directly as published could ship with an empty
  // description, an asymmetry with the dedicated publish path.
  if (
    dataWithAuthor.status === 'published' &&
    (!dataWithAuthor.description || dataWithAuthor.description.trim().length === 0)
  ) {
    return { error: 'descriptionRequired' };
  }

  const slug = dataWithAuthor.slug!.trim();
  if (await isSlugTaken(slug)) {
    return { error: 'slugTaken' };
  }

  // `kind` reflects the lifecycle moment this row represents: `'created'`
  // for a draft submission (announcing "looking for edit requests"),
  // `'published'` for a publish-on-creation. A draft created here that is
  // later promoted via `publishChunkEntry` emits a second feed_items row
  // with kind `'published'` — that two-step trail is intentional.
  const initialFeedKind: 'created' | 'published' =
    dataWithAuthor.status === 'published' ? 'published' : 'created';

  try {
    const txResult = await db.transaction(async (tx) => {
      const [chunk] = await tx
        .insert(chunks)
        .values(buildChunkCreateValues(dataWithAuthor))
        .returning({ id: chunks.id, slug: chunks.slug });

      // Feedback topics only make sense in draft. Skipping the write
      // when status is already published keeps the table sparse —
      // future-published rows never carry rows that would have to be
      // cleared by `publishChunkEntry` anyway.
      if (dataWithAuthor.status === 'draft' && dataWithAuthor.feedbackTopics?.length) {
        await resetChunkFeedbackTopics(tx, chunk.id, dataWithAuthor.feedbackTopics);
      }

      await tx.insert(feedItems).values({
        entityType: 'chunk',
        entityId: chunk.id,
        actorId: user.id,
        metadata: { kind: initialFeedKind, slug: chunk.slug },
      });

      const grant = await grantPointsForPost(tx, user.id, {
        type: 'chunk',
        id: chunk.id,
      });

      const linkedToGame = options?.linkTarget
        ? await linkNewChunkToGameMove(tx, {
            gameId: options.linkTarget.gameId,
            ply: options.linkTarget.ply,
            chunkId: chunk.id,
            suggestedById: user.id,
          })
        : false;

      return { chunk, grant, linkedToGame };
    });

    dispatchChunkEvent({
      kind: 'created',
      actorId: user.id,
      chunkId: txResult.chunk.id,
      slug: txResult.chunk.slug,
      initialStatus: initialFeedKind === 'published' ? 'published' : 'draft',
    });

    const grant = txResult.grant;
    const coinCapped =
      grant.status === 'capped' || (grant.status === 'granted' && grant.cappedDaily);

    return {
      success: true,
      id: txResult.chunk.id,
      slug: txResult.chunk.slug,
      ...(txResult.linkedToGame ? { linkedToGame: true } : {}),
      ...(grant.status === 'granted'
        ? {
            pointGrant: {
              pointEventId: grant.pointEventId,
              amount: grant.amount,
            },
          }
        : {}),
      ...(coinCapped ? { coinCapped: true } : {}),
    };
  } catch (err) {
    // Race-window backstop: another writer claimed the slug between the
    // preflight read and the INSERT. The 23505 path is also the only one
    // that fires if the preflight is bypassed (e.g. malformed client).
    if (isUniqueViolation(err)) {
      return { error: 'slugTaken' };
    }
    throw err;
  }
}

export async function updateChunkEntry(
  id: string,
  data: ChunkMutationData
): Promise<UpdateChunkResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.updateChunk);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!id) {
    return { error: 'notFound' };
  }

  const dataWithAuthor: ChunkMutationData = { ...data, userId: user.id };

  const validationError = validateChunkMutationData(dataWithAuthor, 'update');
  if (validationError) {
    return { error: validationError };
  }

  const loaded = await loadOwnedChunk(id, user.id);
  if ('error' in loaded) {
    return loaded;
  }
  const { chunk } = loaded;
  // Field-level edits are only allowed while the chunk is in the
  // workshop state. Once published, content is locked at the
  // application layer so existing links / discussion threads keep
  // pointing at the same canonical title and description; the only
  // way out of published is soft-delete via `deleteChunkEntry`.
  if (chunk.status === 'published') {
    return { error: 'cannotEditPublished' };
  }

  // Slug rename is a draft-only opt-in. Skipping the cascade when
  // the payload's slug matches the current one (or is omitted) keeps
  // the topic_posts UPDATE off the hot path for ordinary
  // title/description edits.
  const requestedSlug = dataWithAuthor.slug?.trim();
  const slugChanging = !!requestedSlug && requestedSlug !== chunk.slug;
  if (slugChanging && (await isSlugTaken(requestedSlug))) {
    return { error: 'slugTaken' };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(chunks)
        .set(buildChunkUpdateValues(dataWithAuthor))
        .where(and(eq(chunks.id, id), eq(chunks.userId, user.id), isNull(chunks.deletedAt)));

      // Discussion threads on a chunk are keyed by
      // `(topic_type='chunk', topic_key=chunk.slug)`. Renaming the
      // chunk's slug without rewriting the topic_key would orphan
      // every reply that's been left on the draft. Doing the rewrite
      // inside the same transaction keeps the slug + the discussion
      // pointer atomic for any concurrent reader.
      if (slugChanging) {
        await tx
          .update(topicPosts)
          .set({ topicKey: requestedSlug! })
          .where(and(eq(topicPosts.topicType, 'chunk'), eq(topicPosts.topicKey, chunk.slug)));
      }

      // Update path is guarded above to draft-only, so the topics
      // payload (or its absence — treated as "no topics requested")
      // always reflects what the author wants right now.
      if (dataWithAuthor.feedbackTopics !== undefined) {
        await resetChunkFeedbackTopics(tx, id, dataWithAuthor.feedbackTopics);
      }
    });
  } catch (err) {
    // Race-window backstop for the chunks.slug UNIQUE — another
    // chunk could claim `requestedSlug` between the preflight and
    // the UPDATE. Same translation as the create path.
    if (slugChanging && isUniqueViolation(err)) {
      return { error: 'slugTaken' };
    }
    throw err;
  }

  const finalSlug = slugChanging ? requestedSlug! : chunk.slug;

  // Preserve the overwritten values for the activity log (chunks keep no
  // revision history), compared against the same normalized values written
  // to the row (`buildChunkUpdateValues`).
  const changes = diffFields(chunk, buildChunkUpdateValues(dataWithAuthor), [
    'title',
    'description',
    'representativeFen',
  ]);
  if (slugChanging) {
    changes.slug = { from: chunk.slug, to: requestedSlug! };
  }

  dispatchChunkEvent({
    kind: 'updated',
    actorId: user.id,
    chunkId: id,
    slug: finalSlug,
    ...(slugChanging ? { previousSlug: chunk.slug } : {}),
    changes,
  });

  return { success: true };
}

/**
 * Publish a draft chunk. Owner-only; one-way transition (an
 * `unpublishChunkEntry` used to exist but was removed — once the
 * canonical title and description are settled the chunk is locked
 * against owner edits at the application layer, and the only way out
 * of the published state is soft-delete via `deleteChunkEntry`).
 *
 * The transition additionally requires a non-empty description: a
 * published chunk is a canonical catalog entry and silently shipping a
 * description-less row would degrade the catalog. The check matches
 * the application-level invariant; the DB column itself stays nullable
 * because existing rows (and drafts in flight) legitimately carry no
 * description yet.
 *
 * Idempotent at the application layer: re-publishing an already-
 * published chunk returns success without writing.
 */
export async function publishChunkEntry(id: string): Promise<UpdateChunkResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.updateChunk);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!id) {
    return { error: 'notFound' };
  }

  const loaded = await loadOwnedChunk(id, user.id);
  if ('error' in loaded) {
    return loaded;
  }
  const { chunk } = loaded;
  if (chunk.status === 'published') {
    return { success: true };
  }
  if (!chunk.description || chunk.description.trim().length === 0) {
    return { error: 'descriptionRequired' };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(chunks)
      .set({ status: 'published', publishedAt: now })
      .where(and(eq(chunks.id, id), eq(chunks.userId, user.id), isNull(chunks.deletedAt)));

    // Feedback topics are draft-only signals — wipe them so a future
    // re-draft via admin tooling doesn't surface stale flags from the
    // pre-publish workshop session.
    await tx.delete(chunkFeedbackTopics).where(eq(chunkFeedbackTopics.chunkId, id));

    // Auto-reject any still-pending edit requests so they don't
    // strand behind the now-inaccessible review UI (the
    // /chunks/[slug]/edit-requests page 404s for non-draft chunks).
    await autoRejectPendingEditRequests(tx, id, user.id, now);

    // Surface the publish in the home timeline. A chunk created as
    // draft and later promoted thus emits two feed rows (one `created`
    // from `createChunkEntry`, one `published` here); a chunk created
    // directly as published emits only the single `published` row.
    await tx.insert(feedItems).values({
      entityType: 'chunk',
      entityId: id,
      actorId: user.id,
      metadata: { kind: 'published', slug: chunk.slug },
    });
  });

  dispatchChunkEvent({
    kind: 'published',
    actorId: user.id,
    chunkId: id,
    slug: chunk.slug,
  });

  return { success: true };
}

export async function deleteChunkEntry(id: string): Promise<DeleteChunkResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.deleteChunk);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!id) {
    return { error: 'notFound' };
  }

  const loaded = await loadOwnedChunk(id, user.id);
  if ('error' in loaded) {
    return loaded;
  }
  const { chunk } = loaded;

  const deletedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(chunks)
      .set({ deletedAt })
      .where(and(eq(chunks.id, id), eq(chunks.userId, user.id), isNull(chunks.deletedAt)));

    // Reverse the creation point grant. Capped at the live `earned`
    // balance, so coins already spent are not pursued and the balance
    // never goes negative.
    await clawbackPointsForPost(tx, user.id, { type: 'chunk', id });

    // Auto-reject any still-pending edit requests for the same
    // reason publish does it: the /chunks/[slug]/edit-requests page
    // 404s for deleted chunks (soft delete doesn't cascade to
    // chunk_edit_requests at the FK level), so without this sweep
    // the rows would sit pending forever with no path to resolve.
    await autoRejectPendingEditRequests(tx, id, user.id, deletedAt);
  });

  dispatchChunkEvent({
    kind: 'deleted',
    actorId: user.id,
    chunkId: id,
    slug: chunk.slug,
  });

  return { success: true };
}
