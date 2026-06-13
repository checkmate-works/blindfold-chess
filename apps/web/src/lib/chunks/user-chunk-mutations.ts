import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { chunkFeedbackTopics, chunks, db, feedItems, topicPosts } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { clawbackPointsForPost, grantPointsForPost } from '@/lib/points';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import { dispatchChunkEvent } from './chunk-event-handlers';
import { autoRejectPendingEditRequests, guardChunkOwnership } from './chunk-mutation-guards';
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

export type CreateChunkResult =
  | {
      success: true;
      id: string;
      slug: string;
      pointGrant?: { pointEventId: string; amount: number };
    }
  | { error: string };

export type UpdateChunkResult = { success: true } | { error: string };

export type DeleteChunkResult = ActionResult;

export async function createChunkEntry(data: ChunkMutationData): Promise<CreateChunkResult> {
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

  // UX preflight only; the DB UNIQUE constraint is the canonical guarantee.
  // `findChunkBySlug` returns soft-deleted rows too, matching the column
  // constraint (the unique index has no `WHERE deleted_at IS NULL` clause).
  const slug = dataWithAuthor.slug!.trim();
  const existing = await findChunkBySlug(slug);
  if (existing) {
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

      const pointGrant = await grantPointsForPost(tx, user.id, {
        type: 'chunk',
        id: chunk.id,
      });

      return { chunk, pointGrant };
    });

    dispatchChunkEvent({
      kind: 'created',
      actorId: user.id,
      chunkId: txResult.chunk.id,
      slug: txResult.chunk.slug,
      initialStatus: initialFeedKind === 'published' ? 'published' : 'draft',
    });

    return {
      success: true,
      id: txResult.chunk.id,
      slug: txResult.chunk.slug,
      ...(txResult.pointGrant
        ? {
            pointGrant: {
              pointEventId: txResult.pointGrant.pointEventId,
              amount: txResult.pointGrant.amount,
            },
          }
        : {}),
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

  const [chunk] = await db
    .select({
      id: chunks.id,
      userId: chunks.userId,
      slug: chunks.slug,
      status: chunks.status,
      deletedAt: chunks.deletedAt,
      // Pre-update values, captured so the activity log can preserve
      // whatever this in-place edit overwrites (chunks keep no history).
      title: chunks.title,
      description: chunks.description,
      representativeFen: chunks.representativeFen,
    })
    .from(chunks)
    .where(eq(chunks.id, id))
    .limit(1);

  if (!chunk) {
    return { error: 'notFound' };
  }
  const ownershipError = guardChunkOwnership(chunk, user.id);
  if (ownershipError) {
    return ownershipError;
  }
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
  if (slugChanging) {
    // UX preflight only; the DB UNIQUE on chunks.slug is the canonical
    // guarantee. Matches the create-path pattern in `createChunkEntry`.
    const existing = await findChunkBySlug(requestedSlug);
    if (existing) {
      return { error: 'slugTaken' };
    }
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

  // Diff the overwritten fields (old → new) so the activity log keeps the
  // prior values this in-place edit discarded. Compared against the same
  // normalized values written to the row (`buildChunkUpdateValues`).
  const newValues = buildChunkUpdateValues(dataWithAuthor);
  const changes: Record<string, { from: string | null; to: string | null }> = {};
  const compareKeys = ['title', 'description', 'representativeFen'] as const;
  for (const key of compareKeys) {
    const from = chunk[key] ?? null;
    const to = newValues[key] ?? null;
    if (from !== to) {
      changes[key] = { from, to };
    }
  }
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

  const [chunk] = await db
    .select({
      id: chunks.id,
      userId: chunks.userId,
      slug: chunks.slug,
      description: chunks.description,
      status: chunks.status,
      deletedAt: chunks.deletedAt,
    })
    .from(chunks)
    .where(eq(chunks.id, id))
    .limit(1);

  if (!chunk) {
    return { error: 'notFound' };
  }
  const ownershipError = guardChunkOwnership(chunk, user.id);
  if (ownershipError) {
    return ownershipError;
  }
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

  const [chunk] = await db
    .select({
      id: chunks.id,
      userId: chunks.userId,
      slug: chunks.slug,
      deletedAt: chunks.deletedAt,
    })
    .from(chunks)
    .where(eq(chunks.id, id))
    .limit(1);

  if (!chunk) {
    return { error: 'notFound' };
  }
  const ownershipError = guardChunkOwnership(chunk, user.id);
  if (ownershipError) {
    return ownershipError;
  }

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
