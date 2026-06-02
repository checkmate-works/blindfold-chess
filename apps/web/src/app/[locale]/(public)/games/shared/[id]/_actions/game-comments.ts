'use server';

import { authenticateAndGuard } from '@/lib/auth';
import {
  GAME_COMMENT_LIKE_TARGET,
  editGameComment,
  getGameCommentAuthorId,
  getGameCommentParent,
  getGameCommentTarget,
  insertGameComment,
  softDeleteGameComment,
} from '@/lib/db/game-comments';
import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

import { MAX_GAME_COMMENT_LENGTH } from '../_lib/comment-constants';

export type AddGameCommentInput = {
  gameId: string;
  /** Move the comment is anchored to (0-based ply), or null for the whole game. */
  ply: number | null;
  /** Parent comment id when this is a reply; the reply inherits the parent's ply. */
  parentId?: string | null;
  body: string;
};

export type AddGameCommentResponse =
  | { success: true; id: string; createdAt: string; updatedAt: string }
  | { success: false; error: string };

export type EditGameCommentResponse =
  | { success: true; updatedAt: string }
  | { success: false; error: string };

export type DeleteGameCommentResponse = { success: true } | { success: false; error: string };

function normalizeBody(body: unknown): string | null {
  const trimmed = typeof body === 'string' ? body.trim() : '';
  if (trimmed.length === 0 || trimmed.length > MAX_GAME_COMMENT_LENGTH) return null;
  return trimmed;
}

/**
 * Post an advice comment (or reply) on a shared game (members-only). A
 * top-level comment is anchored to a move via `ply`; a reply (`parentId` set)
 * inherits its parent's ply so the whole move thread stays on one ply.
 */
export async function addGameCommentAction(
  input: AddGameCommentInput
): Promise<AddGameCommentResponse> {
  try {
    if (!input || typeof input.gameId !== 'string' || !UUID_RE.test(input.gameId)) {
      return { success: false, error: 'invalid_input' };
    }

    let ply =
      input.ply == null
        ? null
        : Number.isInteger(input.ply) && input.ply >= 0
          ? input.ply
          : undefined;
    if (ply === undefined) return { success: false, error: 'invalid_input' };

    let parentId: string | null = null;
    if (input.parentId != null) {
      if (typeof input.parentId !== 'string' || !UUID_RE.test(input.parentId)) {
        return { success: false, error: 'invalid_input' };
      }
      parentId = input.parentId;
    }

    const body = normalizeBody(input.body);
    if (body === null) return { success: false, error: 'invalid_body' };

    const guardResult = await authenticateAndGuard(RATE_LIMITS.createGameComment);
    if ('error' in guardResult) return { success: false, error: guardResult.error };
    const { user } = guardResult;

    // A reply must target a live comment on the same game; it inherits that
    // comment's ply (authoritative — the client-sent ply is ignored for replies).
    if (parentId !== null) {
      const parent = await getGameCommentParent(parentId);
      if (!parent || parent.gameId !== input.gameId) {
        return { success: false, error: 'not_found' };
      }
      ply = parent.ply;
    }

    const { id, createdAt, updatedAt } = await insertGameComment({
      gameId: input.gameId,
      ply,
      parentId,
      authorId: user.id,
      body,
    });

    return {
      success: true,
      id,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  } catch (error) {
    return handleServerActionError(error, '[addGameCommentAction]');
  }
}

/** Edit one's own advice comment in place (members-only; author check). */
export async function editGameCommentAction(
  commentId: string,
  body: string
): Promise<EditGameCommentResponse> {
  try {
    if (typeof commentId !== 'string' || !UUID_RE.test(commentId)) {
      return { success: false, error: 'invalid_input' };
    }
    const normalized = normalizeBody(body);
    if (normalized === null) return { success: false, error: 'invalid_body' };

    const guardResult = await authenticateAndGuard(RATE_LIMITS.editGameComment);
    if ('error' in guardResult) return { success: false, error: guardResult.error };
    const { user } = guardResult;

    const authorId = await getGameCommentAuthorId(commentId);
    if (authorId === undefined) return { success: false, error: 'not_found' };
    if (authorId !== user.id) return { success: false, error: 'forbidden' };

    const result = await editGameComment(commentId, normalized);
    if (!result) return { success: false, error: 'not_found' };

    return { success: true, updatedAt: result.updatedAt.toISOString() };
  } catch (error) {
    return handleServerActionError(error, '[editGameCommentAction]');
  }
}

/** Delete one's own advice comment (members-only; author check). */
export async function deleteGameCommentAction(
  commentId: string
): Promise<DeleteGameCommentResponse> {
  try {
    if (typeof commentId !== 'string' || !UUID_RE.test(commentId)) {
      return { success: false, error: 'invalid_input' };
    }

    const guardResult = await authenticateAndGuard(RATE_LIMITS.createGameComment);
    if ('error' in guardResult) return { success: false, error: guardResult.error };
    const { user } = guardResult;

    const authorId = await getGameCommentAuthorId(commentId);
    if (authorId === undefined) return { success: false, error: 'not_found' };
    if (authorId !== user.id) return { success: false, error: 'forbidden' };

    await softDeleteGameComment(commentId);
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, '[deleteGameCommentAction]');
  }
}

/**
 * Toggle a like on a shared-game comment (members-only). Reuses the generic
 * polymorphic like machinery under `target_type = 'game_comment'`, notifying
 * the comment's author and revalidating the game's detail page.
 */
export async function toggleGameCommentLikeAction(
  commentId: string,
  locale: string
): Promise<ToggleLikeResult> {
  try {
    return await performEntityToggleLike({
      id: commentId,
      locale,
      fieldName: 'commentId',
      targetType: GAME_COMMENT_LIKE_TARGET,
      fetchOwner: async (id) => {
        const target = await getGameCommentTarget(id);
        return target ? { userId: target.authorId, extra: target.gameId } : null;
      },
      // Stash the game id so the notification can deep-link to the comment
      // (`/games/shared/{gameId}?comment={commentId}`); the comment id is the
      // notification's targetId.
      notificationMeta: (_id, gameId) => ({ gameId }),
      revalidatePaths: (loc, _id, gameId) => (gameId ? [`/${loc}/games/shared/${gameId}`] : []),
    });
  } catch (error) {
    return handleServerActionError(error, '[toggleGameCommentLikeAction]');
  }
}
