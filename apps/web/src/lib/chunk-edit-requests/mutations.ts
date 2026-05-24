import { revalidatePath } from 'next/cache';

import { and, eq, isNull, sql } from 'drizzle-orm';
import 'server-only';

import { authenticateAndGuard } from '@/lib/auth';
import { chunkEditRequests, chunks, db } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

import { getEditRequestById, getViewerPendingEditRequestForChunk } from './queries';
import type { SubmitEditRequestPayload } from './validation';
import { validateSubmitEditRequest } from './validation';

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

  // One pending suggestion per (chunk, proposer). The DB schema does
  // not enforce this — keeping the constraint at the application
  // layer leaves room for a future "edit your pending suggestion"
  // flow that would temporarily relax the check during in-place
  // updates. Until then, the visitor is expected to withdraw and
  // resubmit, which the UI surfaces on the dedicated edit-requests
  // page.
  const existingPendingId = await getViewerPendingEditRequestForChunk(chunk.id, user.id);
  if (existingPendingId) {
    return { error: 'alreadyHasPending' };
  }

  const validated = validateSubmitEditRequest(params.payload, {
    title: chunk.title,
    description: chunk.description,
  });
  if (typeof validated === 'string') {
    return { error: validated };
  }

  let inserted: { id: string };
  try {
    const rows = await db
      .insert(chunkEditRequests)
      .values({
        chunkId: chunk.id,
        proposerId: user.id,
        proposedTitle: validated.hasTitleProposal ? validated.proposedTitle : null,
        proposedDescription: validated.hasDescriptionProposal
          ? validated.proposedDescription
          : null,
        comment: validated.comment,
      })
      .returning({ id: chunkEditRequests.id });
    inserted = rows[0];
  } catch (err) {
    // Race-window backstop: the application-layer check above and
    // the partial unique index `uq_chunk_edit_requests_one_pending`
    // both guard one-pending-per-(chunk, proposer), but two
    // simultaneous submits can pass the check before either INSERT
    // commits. The index then fires 23505 on the second insert.
    if (isUniqueViolation(err)) {
      return { error: 'alreadyHasPending' };
    }
    throw err;
  }

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

  const now = new Date();
  const terminal = TERMINAL_STATUS[params.action];

  await db.transaction(async (tx) => {
    // Serialize concurrent accepts on the same chunk by locking the
    // chunk row first. Two browser tabs accepting different pending
    // suggestions simultaneously would otherwise both succeed at the
    // request-row UPDATE but race on the chunks UPDATE, leaving one
    // accepted-but-not-applied. The lock is taken before either UPDATE
    // so an interleaved second transaction waits here until the first
    // commits. Reject / withdraw paths technically don't need the
    // lock, but taking it uniformly keeps the transaction shape
    // simple and the contention scope is per-chunk (low-frequency).
    await tx.execute(sql`SELECT 1 FROM chunks WHERE id = ${chunk.id} FOR UPDATE`);

    await tx
      .update(chunkEditRequests)
      .set({
        status: terminal,
        resolvedAt: now,
        resolverId: user.id,
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

  // Fire-and-forget notification to the proposer on accept only.
  //
  // Reject is intentionally silent: when multiple suggestions queue up,
  // accepting one effectively rejects the others, and notifying only
  // the explicitly-rejected proposers (not the implicitly-superseded
  // ones) would create an asymmetric experience that depends on
  // owner-internal scheduling rather than the proposer's action.
  //
  // Withdraw is also silent: the owner has nothing to act on once the
  // suggestion is gone, and the pending-count badge on the chunk page
  // already reflects the reduction the next time they visit. A trailing
  // notification would chase down a dead target — see how reply
  // notifications behave when the parent post is later deleted.
  if (params.action === 'accept' && request.proposerId && request.proposerId !== user.id) {
    createNotification({
      userId: request.proposerId,
      actorId: user.id,
      type: 'chunk_edit_request_accepted',
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

export function rejectEditRequestEntry(requestId: string): Promise<ResolveEditRequestResult> {
  return resolveEditRequest({ requestId, action: 'reject' });
}

export function withdrawEditRequestEntry(requestId: string): Promise<ResolveEditRequestResult> {
  return resolveEditRequest({ requestId, action: 'withdraw' });
}
