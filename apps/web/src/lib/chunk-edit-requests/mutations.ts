import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import { authenticateAndGuard } from '@/lib/auth';
import { chunkEditRequests, chunks, db } from '@/lib/db';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

import { getEditRequestById } from './queries';
import type { SubmitEditRequestPayload } from './validation';
import { parseResolverComment, validateSubmitEditRequest } from './validation';

/**
 * Server-side core for the Qiita-style "suggest an edit" flow on a
 * draft chunk. Each public Server Action under
 * `/chunks/[slug]/_actions/` is a thin async wrapper around one of the
 * four transitions below.
 *
 * @design "draft only" applies to new submissions and to accept/reject
 * Submitting against a published chunk is rejected, and so is
 * accepting / rejecting a pending request whose chunk is currently
 * published. Withdrawals stay legal in either state because the
 * proposer is dropping their own suggestion — that does not mutate
 * the chunk and should not be gated on its current lifecycle.
 *
 * @design owner cannot self-propose
 * The owner edits their draft directly via `updateChunkEntry`. An
 * edit request from the owner would be redundant and would clutter
 * the review queue, so it is rejected at submit time even though
 * the underlying RLS policy already forbids it.
 */

export type SubmitEditRequestResult = { success: true; id: string } | { error: string };

export type ResolveEditRequestResult = { success: true } | { error: string };

async function loadChunkForRequest(id: string) {
  const [chunk] = await db
    .select({
      id: chunks.id,
      userId: chunks.userId,
      slug: chunks.slug,
      title: chunks.title,
      description: chunks.description,
      status: chunks.status,
      deletedAt: chunks.deletedAt,
    })
    .from(chunks)
    .where(eq(chunks.id, id))
    .limit(1);
  return chunk ?? null;
}

export async function submitEditRequestEntry(params: {
  chunkId: string;
  payload: SubmitEditRequestPayload;
}): Promise<SubmitEditRequestResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.submitChunkEditRequest);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!params.chunkId) {
    return { error: 'notFound' };
  }

  const chunk = await loadChunkForRequest(params.chunkId);
  if (!chunk || chunk.deletedAt) {
    return { error: 'notFound' };
  }
  if (chunk.userId === user.id) {
    return { error: 'ownerCannotPropose' };
  }
  if (chunk.status !== 'draft') {
    // The owner has already locked the chunk; suggestions are
    // pointless until they un-publish.
    return { error: 'chunkNotDraft' };
  }

  const validated = validateSubmitEditRequest(params.payload, {
    title: chunk.title,
    description: chunk.description,
  });
  if (typeof validated === 'string') {
    return { error: validated };
  }

  const [inserted] = await db
    .insert(chunkEditRequests)
    .values({
      chunkId: chunk.id,
      proposerId: user.id,
      proposedTitle: validated.hasTitleProposal ? validated.proposedTitle : null,
      proposedDescription: validated.hasDescriptionProposal ? validated.proposedDescription : null,
      comment: validated.comment,
    })
    .returning({ id: chunkEditRequests.id });

  logActivityEvent({
    userId: user.id,
    action: 'submit_chunk_edit_request',
    targetType: 'chunk_edit_request',
    targetId: inserted.id,
    metadata: {
      chunkId: chunk.id,
      slug: chunk.slug,
      hasTitleProposal: validated.hasTitleProposal,
      hasDescriptionProposal: validated.hasDescriptionProposal,
    },
  });

  // Fire-and-forget notification to the chunk owner. The application-
  // and RLS-level "owner exists" check at submit time means we only
  // reach this line when the owner is a live account.
  if (chunk.userId) {
    createNotification({
      userId: chunk.userId,
      actorId: user.id,
      type: 'chunk_edit_request_submitted',
      targetType: 'chunk_edit_request',
      targetId: inserted.id,
      metadata: { chunkId: chunk.id, slug: chunk.slug },
    });
  }

  revalidatePath(`/chunks/${chunk.slug}`);

  return { success: true, id: inserted.id };
}

type ResolveParams = {
  requestId: string;
  action: 'accept' | 'reject' | 'withdraw';
  resolverComment?: string | null;
};

const ACTIVITY_ACTION: Record<ResolveParams['action'], string> = {
  accept: 'accept_chunk_edit_request',
  reject: 'reject_chunk_edit_request',
  withdraw: 'withdraw_chunk_edit_request',
};

const TERMINAL_STATUS: Record<ResolveParams['action'], 'accepted' | 'rejected' | 'withdrawn'> = {
  accept: 'accepted',
  reject: 'rejected',
  withdraw: 'withdrawn',
};

async function resolveEditRequest(params: ResolveParams): Promise<ResolveEditRequestResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.resolveChunkEditRequest);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!params.requestId) {
    return { error: 'notFound' };
  }

  const request = await getEditRequestById(params.requestId);
  if (!request) {
    return { error: 'notFound' };
  }
  if (request.status !== 'pending') {
    return { error: 'alreadyResolved' };
  }

  const chunk = await loadChunkForRequest(request.chunkId);
  if (!chunk || chunk.deletedAt) {
    // The parent chunk got hard-deleted between request fetch and now,
    // or was never readable — surface as notFound so the UI cleans up.
    return { error: 'notFound' };
  }

  // Per-action authorization.
  if (params.action === 'withdraw') {
    if (request.proposerId !== user.id) {
      return { error: 'unauthorized' };
    }
  } else {
    // accept / reject — chunk owner only.
    if (chunk.userId !== user.id) {
      return { error: 'unauthorized' };
    }
    // Accept / reject only meaningful while the chunk is still in the
    // workshop state. Withdrawals stay legal regardless.
    if (chunk.status !== 'draft') {
      return { error: 'chunkNotDraft' };
    }
  }

  let resolvedComment: string | null = null;
  if (params.action === 'reject') {
    const commentResult = parseResolverComment(params.resolverComment);
    if (!commentResult.ok) {
      return { error: commentResult.error };
    }
    resolvedComment = commentResult.value;
  }

  const now = new Date();
  const terminal = TERMINAL_STATUS[params.action];

  await db.transaction(async (tx) => {
    await tx
      .update(chunkEditRequests)
      .set({
        status: terminal,
        resolvedAt: now,
        resolverId: user.id,
        resolverComment: resolvedComment,
      })
      .where(and(eq(chunkEditRequests.id, request.id), eq(chunkEditRequests.status, 'pending')));

    if (params.action === 'accept') {
      // Apply the proposed fields to the chunk in the same transaction so
      // the acceptance and the content change commit together. Fields not
      // included in the proposal stay untouched — drizzle treats `undefined`
      // as "skip column".
      const updates: { title?: string; description?: string | null } = {};
      if (request.proposedTitle !== null) {
        updates.title = request.proposedTitle.trim();
      }
      // proposedDescription === null means the proposal targeted only the
      // title; an explicit empty value is allowed too (descriptions are
      // nullable on `chunks`).
      if (request.proposedDescription !== null) {
        updates.description = request.proposedDescription;
      }
      if (Object.keys(updates).length > 0) {
        await tx
          .update(chunks)
          .set(updates)
          .where(and(eq(chunks.id, chunk.id), isNull(chunks.deletedAt)));
      }
    }
  });

  logActivityEvent({
    userId: user.id,
    action: ACTIVITY_ACTION[params.action],
    targetType: 'chunk_edit_request',
    targetId: request.id,
    metadata: {
      chunkId: chunk.id,
      slug: chunk.slug,
      // Snapshot the resolved values for forensic clarity — knowing
      // what was accepted is more useful than re-querying the row
      // later (which may have been further edited).
      appliedTitle: params.action === 'accept' ? request.proposedTitle : null,
      appliedDescription: params.action === 'accept' ? request.proposedDescription : null,
    },
  });

  // Fire-and-forget notification to the affected party:
  // - accept / reject → the proposer (their suggestion was resolved)
  // - withdraw        → the chunk owner (a queued suggestion just vanished)
  // Skipped when the recipient is missing (proposer hard-deleted, or
  // chunk orphaned) or equals the actor (no self-notifications).
  const notificationType = {
    accept: 'chunk_edit_request_accepted',
    reject: 'chunk_edit_request_rejected',
    withdraw: 'chunk_edit_request_withdrawn',
  }[params.action];
  const recipient =
    params.action === 'withdraw' ? (chunk.userId ?? null) : (request.proposerId ?? null);
  if (recipient && recipient !== user.id) {
    createNotification({
      userId: recipient,
      actorId: user.id,
      type: notificationType,
      targetType: 'chunk_edit_request',
      targetId: request.id,
      metadata: { chunkId: chunk.id, slug: chunk.slug },
    });
  }

  revalidatePath(`/chunks/${chunk.slug}`);
  if (params.action === 'accept') {
    revalidatePath('/chunks');
  }

  return { success: true };
}

export function acceptEditRequestEntry(requestId: string): Promise<ResolveEditRequestResult> {
  return resolveEditRequest({ requestId, action: 'accept' });
}

export function rejectEditRequestEntry(
  requestId: string,
  resolverComment?: string | null
): Promise<ResolveEditRequestResult> {
  return resolveEditRequest({ requestId, action: 'reject', resolverComment });
}

export function withdrawEditRequestEntry(requestId: string): Promise<ResolveEditRequestResult> {
  return resolveEditRequest({ requestId, action: 'withdraw' });
}
