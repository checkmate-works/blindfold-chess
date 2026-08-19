'use server';

import { toPositionKey } from '@blindfold-chess/features/chess-core';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import { canDeleteChunkLink } from '@/lib/chunks/chunk-link-permissions';
import {
  deleteRepertoireChunk,
  getRepertoireChunkForDelete,
  insertRepertoireChunk,
  isLinkableChunkForViewer,
} from '@/lib/db/repertoire-chunks';
import { notifyRepertoireOwnerOfChunkLink } from '@/lib/notifications/repertoire-chunk-link-notification';
import { getRepertoireLineForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

export type AddRepertoireChunkInput = {
  repertoireId: string;
  /** 1-based line number (the `[lineNo]` URL segment). */
  lineNo: number;
  /** 1-based half-move the chunk is asserted to apply to (matches the page's `initialPly`). */
  ply: number;
  chunkId: string;
};

export type AddRepertoireChunkResponse =
  { success: true; id: string; createdAt: string } | { success: false; error: string };

export type DeleteRepertoireChunkResponse = { success: true } | { success: false; error: string };

/**
 * Link a chunk to a position reached by a repertoire line (members-only). Any
 * signed-in member may suggest a link; it is deduped by the (repertoire,
 * position, chunk) unique constraint, so a repeat link surfaces as
 * `already_linked` rather than an error.
 *
 * @design position_key is derived here, never accepted from the client
 * The client sends `(lineNo, ply)`, not a FEN. `getRepertoireLineForViewer`
 * both enforces the viewer's read access (building/private → owner only,
 * followers_only → owner or follower) and confirms the line exists;
 * `replayRepertoireLine` then replays it server-side to the requested ply,
 * which is the ONLY source of the FEN that becomes `position_key`. A
 * malicious or stale client cannot pin a link to a position it never
 * actually reached.
 *
 * Eligible chunks are the published catalog plus the caller's own drafts —
 * see `linkableChunkPredicate`. The check re-asserts server-side what
 * `getLinkableChunkOptionsForViewer` already filtered for the picker.
 */
export async function addRepertoireChunkAction(
  input: AddRepertoireChunkInput
): Promise<AddRepertoireChunkResponse> {
  try {
    if (
      !input ||
      typeof input.repertoireId !== 'string' ||
      !UUID_RE.test(input.repertoireId) ||
      typeof input.chunkId !== 'string' ||
      !UUID_RE.test(input.chunkId)
    ) {
      return { success: false, error: 'invalid_input' };
    }
    if (!Number.isInteger(input.lineNo) || input.lineNo < 1) {
      return { success: false, error: 'invalid_input' };
    }
    if (!Number.isInteger(input.ply) || input.ply < 1) {
      return { success: false, error: 'invalid_input' };
    }

    const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.linkRepertoireChunk);
    if ('error' in guardResult) return { success: false, error: guardResult.error };
    const { user } = guardResult;

    const data = await getRepertoireLineForViewer(input.repertoireId, input.lineNo, user.id);
    if (!data) return { success: false, error: 'not_found' };

    const { positions, sans } = replayRepertoireLine(data.line);
    // A link at ply 0 would be "the start position", which — like an
    // annotation or a move comment — is not a decision point the chunk could
    // be asserting anything about; positions[] is 0-indexed with index 0 the
    // root, so the valid range for a 1-based ply is [1, sans.length].
    if (input.ply > sans.length) return { success: false, error: 'invalid_input' };
    const positionKey = toPositionKey(positions[input.ply].fen);

    if (!(await isLinkableChunkForViewer(input.chunkId, user.id))) {
      return { success: false, error: 'chunk_not_available' };
    }

    const row = await insertRepertoireChunk({
      repertoireId: input.repertoireId,
      positionKey,
      chunkId: input.chunkId,
      suggestedById: user.id,
    });
    if (!row) return { success: false, error: 'already_linked' };

    // Only a link that actually landed notifies — a deduped repeat would
    // otherwise let anyone re-ping the owner by re-submitting the same pair.
    notifyRepertoireOwnerOfChunkLink({
      actorId: user.id,
      repertoireId: input.repertoireId,
      lineNo: input.lineNo,
      ply: input.ply,
      chunkId: input.chunkId,
      positionKey,
    });

    return { success: true, id: row.id, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    return handleServerActionError(error, '[addRepertoireChunkAction]');
  }
}

/**
 * Remove a chunk link (members-only). Allowed for whoever added it OR the
 * repertoire's registered owner.
 */
export async function deleteRepertoireChunkAction(
  id: string
): Promise<DeleteRepertoireChunkResponse> {
  try {
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      return { success: false, error: 'invalid_input' };
    }

    const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.linkRepertoireChunk);
    if ('error' in guardResult) return { success: false, error: guardResult.error };
    const { user } = guardResult;

    const link = await getRepertoireChunkForDelete(id);
    if (!link) return { success: false, error: 'not_found' };
    if (!canDeleteChunkLink({ ...link, parentOwnerId: link.repertoireOwnerId }, user.id)) {
      return { success: false, error: 'forbidden' };
    }

    await deleteRepertoireChunk(id);
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, '[deleteRepertoireChunkAction]');
  }
}
