import { revalidatePath } from 'next/cache';

import { and, eq, sql } from 'drizzle-orm';
import 'server-only';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, positionChunks, positionEditRequests, positions } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { EDIT_REQUEST_TERMINAL_STATUS, type EditRequestAction } from '@/lib/edit-requests/shared';
import { createNotification } from '@/lib/notifications/notification';
import { getPositionDetailPath } from '@/lib/positions/routes';
import { validateAndDedupeTagIds } from '@/lib/positions/tag-validation';
import type { PositionType } from '@/lib/positions/types';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { UUID_RE } from '@/lib/validations/uuid';

import { applyAcceptedPositionProposal } from './apply-position-edit-proposal';
import {
  getLinkedChunkIdsForPosition,
  getPositionEditRequestById,
  getViewerPendingEditRequestForPosition,
} from './queries';
import type { SubmitPositionEditRequestPayload } from './validation';
import { validateSubmitPositionEditRequest } from './validation';

/**
 * Server-side core for the Qiita-style "suggest which chunks link here"
 * flow on a position. Each public Server Action under the practice detail
 * pages' `_actions/` is a thin async wrapper around one of the four
 * transitions below.
 *
 * @design no draft gating
 * Positions have no draft / published lifecycle, so — unlike the chunk
 * variant — submit and accept / reject are allowed against any non-deleted
 * position. The only gate is `positions.deleted_at`.
 *
 * @design owner cannot self-propose
 * The owner edits their own links directly via the position editor. An
 * edit request from the owner would be redundant, so it is rejected at
 * submit time even though the RLS policy already forbids it.
 */

export type SubmitPositionEditRequestResult = ActionResult<{ id: string }>;

export type ResolvePositionEditRequestResult = ActionResult;

async function loadPositionForRequest(id: string) {
  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, id))
    .limit(1);
  return position ?? null;
}

function revalidatePositionDetail(type: string, id: string): void {
  const path = getPositionDetailPath(type as PositionType, id);
  if (path) revalidatePath(path);
}

export async function submitPositionEditRequestEntry(params: {
  positionId: string;
  payload: SubmitPositionEditRequestPayload;
}): Promise<SubmitPositionEditRequestResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.submitPositionEditRequest);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!params.positionId || !UUID_RE.test(params.positionId)) {
    return { error: 'notFound' };
  }

  const position = await loadPositionForRequest(params.positionId);
  if (!position || position.deletedAt) {
    return { error: 'notFound' };
  }
  if (position.userId === user.id) {
    return { error: 'ownerCannotPropose' };
  }

  // One pending suggestion per (position, proposer). Enforced both here and
  // by the partial unique index (caught below as a tab-race backstop).
  const existingPendingId = await getViewerPendingEditRequestForPosition(position.id, user.id);
  if (existingPendingId) {
    return { error: 'alreadyHasPending' };
  }

  const currentChunkIds = await getLinkedChunkIdsForPosition(position.id);
  const validated = validateSubmitPositionEditRequest(params.payload, { currentChunkIds });
  if (typeof validated === 'string') {
    return { error: validated };
  }

  // Re-assert the proposed set against the live published / non-deleted
  // chunk catalog (the picker is published-only). The pure validator above
  // only checks shape; this is the DB-backed existence gate.
  const tagCheck = await validateAndDedupeTagIds(
    { chunkIds: validated.proposedChunkIds },
    { requirePublishedChunks: true }
  );
  if (!tagCheck.ok) {
    return { error: 'invalidChunk' };
  }

  let inserted: { id: string };
  try {
    const rows = await db
      .insert(positionEditRequests)
      .values({
        positionId: position.id,
        proposerId: user.id,
        proposedChunkIds: validated.proposedChunkIds,
        comment: validated.comment,
      })
      .returning({ id: positionEditRequests.id });
    inserted = rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: 'alreadyHasPending' };
    }
    throw err;
  }

  // Fire-and-forget notification to the position owner. `positionType` is
  // carried in metadata so the notification link can route memory vs.
  // puzzle (unlike chunks, which have a single route). `createNotification`
  // no-ops when the owner was anonymised (account purged → user_id NULL).
  createNotification({
    userId: position.userId,
    actorId: user.id,
    type: 'position_edit_request_submitted',
    targetType: 'position_edit_request',
    targetId: inserted.id,
    metadata: { positionId: position.id, positionType: position.type },
  });

  revalidatePositionDetail(position.type, position.id);

  return { success: true, id: inserted.id };
}

type ResolveParams = {
  requestId: string;
  action: EditRequestAction;
};

async function resolvePositionEditRequest(
  params: ResolveParams
): Promise<ResolvePositionEditRequestResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.resolvePositionEditRequest);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!params.requestId || !UUID_RE.test(params.requestId)) {
    return { error: 'notFound' };
  }

  const request = await getPositionEditRequestById(params.requestId);
  if (!request) {
    return { error: 'notFound' };
  }
  if (request.status !== 'pending') {
    return { error: 'alreadyResolved' };
  }

  const position = await loadPositionForRequest(request.positionId);
  if (!position || position.deletedAt) {
    return { error: 'notFound' };
  }

  // Per-action authorization.
  if (params.action === 'withdraw') {
    if (request.proposerId !== user.id) {
      return { error: 'unauthorized' };
    }
  } else {
    // accept / reject — position owner only.
    if (position.userId !== user.id) {
      return { error: 'unauthorized' };
    }
  }

  const now = new Date();
  const terminal = EDIT_REQUEST_TERMINAL_STATUS[params.action];

  await db.transaction(async (tx) => {
    // Serialize concurrent accepts on the same position by locking the
    // position row first (mirrors the chunk_edit_requests accept path).
    await tx.execute(sql`SELECT 1 FROM positions WHERE id = ${position.id} FOR UPDATE`);

    // Snapshot the live linked-chunk set at resolution time, before any
    // apply, so the history can render a stable proposed-vs-base diff for
    // this now-resolved row (a live diff would collapse to "no change"
    // once an accept makes the live set equal the proposed set).
    const baseRows = await tx
      .select({ chunkId: positionChunks.chunkId })
      .from(positionChunks)
      .where(eq(positionChunks.positionId, position.id));
    const resolvedBaseChunkIds = baseRows.map((row) => row.chunkId);

    await tx
      .update(positionEditRequests)
      .set({
        status: terminal,
        resolvedAt: now,
        resolverId: user.id,
        resolvedBaseChunkIds,
      })
      .where(
        and(eq(positionEditRequests.id, request.id), eq(positionEditRequests.status, 'pending'))
      );

    if (params.action === 'accept') {
      await applyAcceptedPositionProposal(tx, request, position.id, user.id);
    }
  });

  // Fire-and-forget notification to the proposer on accept only. Reject and
  // withdraw are intentionally silent (mirrors the chunk variant).
  if (params.action === 'accept' && request.proposerId && request.proposerId !== user.id) {
    createNotification({
      userId: request.proposerId,
      actorId: user.id,
      type: 'position_edit_request_accepted',
      targetType: 'position_edit_request',
      targetId: request.id,
      metadata: { positionId: position.id, positionType: position.type },
    });
  }

  revalidatePositionDetail(position.type, position.id);

  return { success: true };
}

export function acceptPositionEditRequestEntry(
  requestId: string
): Promise<ResolvePositionEditRequestResult> {
  return resolvePositionEditRequest({ requestId, action: 'accept' });
}

export function rejectPositionEditRequestEntry(
  requestId: string
): Promise<ResolvePositionEditRequestResult> {
  return resolvePositionEditRequest({ requestId, action: 'reject' });
}

export function withdrawPositionEditRequestEntry(
  requestId: string
): Promise<ResolvePositionEditRequestResult> {
  return resolvePositionEditRequest({ requestId, action: 'withdraw' });
}
