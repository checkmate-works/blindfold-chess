'use client';

import { useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { GameCommentItem } from '@/lib/db/game-comments';

import {
  addGameCommentAction,
  deleteGameCommentAction,
  editGameCommentAction,
} from '../_actions/game-comments';
import type { CommentUser, MutationResult } from '../_components/GameCommentContext';
import { buildGameCommentTree } from '../_lib/game-comment-tree';

type Params = {
  gameId: string;
  /** Move the thread is anchored to (0-based ply), or null for the whole-game thread. */
  currentPly: number | null;
  /** All comments for the game (every ply); filtered to `currentPly` here. */
  comments: GameCommentItem[];
  currentUser: CommentUser | null;
};

/**
 * Optimistic state + mutation handlers for one advice thread — a move's
 * (`currentPly = N`) or the whole game's (`currentPly = null`, shown on the
 * opening board). Holds every comment for the game so adds / edits / deletes /
 * replies reflect instantly and survive move-to-move navigation while mounted,
 * filters to the current ply, and builds the Reddit-style tree
 * (`GameCommentNode`). Extracted from the former `GameCommentThread` so the
 * list and the composer can be placed in separate regions by
 * `GameMoveContributions`.
 */
export function useGameCommentThread({
  gameId,
  currentPly,
  comments: initialComments,
  currentUser,
}: Params) {
  const t = useTranslations('sharedGames.comments');
  const [comments, setComments] = useState(initialComments);

  const localizeError = (code: string): string => {
    if (code === 'rateLimited') return t('errors.rateLimited');
    if (code === 'forbidden') return t('errors.forbidden');
    if (code === 'not_found') return t('errors.notFound');
    if (code === 'moderation.blocked') return t('errors.blocked');
    return t('errors.generic');
  };

  const roots = useMemo(
    () => buildGameCommentTree(comments.filter((c) => c.ply === currentPly)),
    [comments, currentPly]
  );
  const commentCount = useMemo(
    () => comments.filter((c) => c.ply === currentPly && c.deletedAt === null).length,
    [comments, currentPly]
  );

  function appendOptimistic(args: {
    id: string;
    parentId: string | null;
    body: string;
    createdAt: string;
    updatedAt: string;
  }) {
    if (!currentUser) return;
    const node: GameCommentItem = {
      id: args.id,
      ply: currentPly,
      parentId: args.parentId,
      body: args.body,
      createdAt: new Date(args.createdAt),
      updatedAt: new Date(args.updatedAt),
      deletedAt: null,
      authorId: currentUser.id,
      author: {
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
      },
      likeCount: 0,
      likedByMe: false,
    };
    setComments((prev) => [...prev, node]);
  }

  async function postComment(parentId: string | null, body: string): Promise<MutationResult> {
    const res = await addGameCommentAction({ gameId, ply: currentPly, parentId, body });
    if (!res.success) return { error: localizeError(res.error) };
    appendOptimistic({
      id: res.id,
      parentId,
      body,
      createdAt: res.createdAt,
      updatedAt: res.updatedAt,
    });
    return {};
  }

  const reply = (parentId: string, body: string) => postComment(parentId, body);

  async function edit(commentId: string, body: string): Promise<MutationResult> {
    const res = await editGameCommentAction(commentId, body);
    if (!res.success) return { error: localizeError(res.error) };
    const updatedAt = new Date(res.updatedAt);
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body, updatedAt } : c)));
    return {};
  }

  async function remove(commentId: string): Promise<MutationResult> {
    const res = await deleteGameCommentAction(commentId);
    if (!res.success) return { error: localizeError(res.error) };
    const deletedAt = new Date();
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, deletedAt } : c)));
    return {};
  }

  return { roots, commentCount, postComment, reply, edit, remove };
}
