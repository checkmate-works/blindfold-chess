'use server';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import {
  deleteGameChunk,
  getGameChunkForDelete,
  insertGameChunk,
  isLinkableChunkForViewer,
} from '@/lib/db/game-chunks';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

export type AddGameChunkInput = {
  gameId: string;
  /** Move the chunk is asserted to apply to (0-based ply). */
  ply: number;
  chunkId: string;
};

export type AddGameChunkResponse =
  { success: true; id: string; createdAt: string } | { success: false; error: string };

export type DeleteGameChunkResponse = { success: true } | { success: false; error: string };

/**
 * Link a chunk to a shared game's move (members-only). Any signed-in member
 * may suggest a link; it is deduped by the (game, ply, chunk) unique
 * constraint, so a repeat link surfaces as `already_linked` rather than an error.
 *
 * Eligible chunks are the published catalog plus the caller's own drafts —
 * see `linkableChunkPredicate`. The check re-asserts server-side what
 * `getLinkableChunkOptionsForViewer` already filtered for the picker.
 */
export async function addGameChunkAction(input: AddGameChunkInput): Promise<AddGameChunkResponse> {
  try {
    if (
      !input ||
      typeof input.gameId !== 'string' ||
      !UUID_RE.test(input.gameId) ||
      typeof input.chunkId !== 'string' ||
      !UUID_RE.test(input.chunkId)
    ) {
      return { success: false, error: 'invalid_input' };
    }
    if (!Number.isInteger(input.ply) || input.ply < 0) {
      return { success: false, error: 'invalid_input' };
    }

    const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.linkGameChunk);
    if ('error' in guardResult) return { success: false, error: guardResult.error };
    const { user } = guardResult;

    if (!(await isLinkableChunkForViewer(input.chunkId, user.id))) {
      return { success: false, error: 'chunk_not_available' };
    }

    const row = await insertGameChunk({
      gameId: input.gameId,
      ply: input.ply,
      chunkId: input.chunkId,
      suggestedById: user.id,
    });
    if (!row) return { success: false, error: 'already_linked' };

    return { success: true, id: row.id, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    return handleServerActionError(error, '[addGameChunkAction]');
  }
}

/**
 * Remove a chunk link (members-only). Allowed for whoever added it OR the
 * game's registered owner.
 */
export async function deleteGameChunkAction(id: string): Promise<DeleteGameChunkResponse> {
  try {
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      return { success: false, error: 'invalid_input' };
    }

    const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.linkGameChunk);
    if ('error' in guardResult) return { success: false, error: guardResult.error };
    const { user } = guardResult;

    const link = await getGameChunkForDelete(id);
    if (!link) return { success: false, error: 'not_found' };
    const isSuggester = link.suggestedById === user.id;
    const isOwner = link.gameAuthorId != null && link.gameAuthorId === user.id;
    if (!isSuggester && !isOwner) return { success: false, error: 'forbidden' };

    await deleteGameChunk(id);
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, '[deleteGameChunkAction]');
  }
}
