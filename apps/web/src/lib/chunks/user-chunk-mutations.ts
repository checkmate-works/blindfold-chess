import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { chunkEditRequests, chunkFeedbackTopics, chunks, db, topicPosts } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { clawbackPointsForPost, grantPointsForPost } from '@/lib/points';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

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

      const pointGrant = await grantPointsForPost(tx, user.id, {
        type: 'chunk',
        id: chunk.id,
      });

      return { chunk, pointGrant };
    });

    logActivityEvent({
      userId: user.id,
      action: 'create_chunk',
      targetType: 'chunk',
      targetId: txResult.chunk.id,
      metadata: { slug: txResult.chunk.slug },
    });

    revalidatePath('/chunks');
    revalidatePath(`/chunks/${txResult.chunk.slug}`);

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
    })
    .from(chunks)
    .where(eq(chunks.id, id))
    .limit(1);

  if (!chunk) {
    return { error: 'notFound' };
  }
  if (chunk.userId !== user.id) {
    return { error: 'unauthorized' };
  }
  if (chunk.deletedAt) {
    return { error: 'alreadyDeleted' };
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

  logActivityEvent({
    userId: user.id,
    action: 'update_chunk',
    targetType: 'chunk',
    targetId: id,
    metadata: slugChanging ? { slug: finalSlug, previousSlug: chunk.slug } : { slug: finalSlug },
  });

  revalidatePath('/chunks');
  revalidatePath(`/chunks/${chunk.slug}`);
  // Revalidate the new URL too — without this the freshly-renamed
  // chunk's page would render a stale-cached 404 for the next
  // viewer who follows the new slug.
  if (slugChanging) {
    revalidatePath(`/chunks/${finalSlug}`);
  }

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
  if (chunk.userId !== user.id) {
    return { error: 'unauthorized' };
  }
  if (chunk.deletedAt) {
    return { error: 'alreadyDeleted' };
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
    // Resolution metadata mirrors the owner-driven reject path so
    // the audit history remains uniform. Intentionally silent —
    // reject does not notify (see chunk-edit-requests/mutations.ts).
    await tx
      .update(chunkEditRequests)
      .set({ status: 'rejected', resolvedAt: now, resolverId: user.id })
      .where(and(eq(chunkEditRequests.chunkId, id), eq(chunkEditRequests.status, 'pending')));
  });

  logActivityEvent({
    userId: user.id,
    action: 'publish_chunk',
    targetType: 'chunk',
    targetId: id,
    metadata: { slug: chunk.slug, from: chunk.status, to: 'published' },
  });

  revalidatePath('/chunks');
  revalidatePath(`/chunks/${chunk.slug}`);

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
      title: chunks.title,
      deletedAt: chunks.deletedAt,
    })
    .from(chunks)
    .where(eq(chunks.id, id))
    .limit(1);

  if (!chunk) {
    return { error: 'notFound' };
  }
  if (chunk.userId !== user.id) {
    return { error: 'unauthorized' };
  }
  if (chunk.deletedAt) {
    return { error: 'alreadyDeleted' };
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
    await tx
      .update(chunkEditRequests)
      .set({ status: 'rejected', resolvedAt: deletedAt, resolverId: user.id })
      .where(and(eq(chunkEditRequests.chunkId, id), eq(chunkEditRequests.status, 'pending')));
  });

  logActivityEvent({
    userId: user.id,
    action: 'delete_chunk',
    targetType: 'chunk',
    targetId: id,
    metadata: { slug: chunk.slug, title: chunk.title },
  });

  revalidatePath('/chunks');
  revalidatePath(`/chunks/${chunk.slug}`);

  return { success: true };
}
