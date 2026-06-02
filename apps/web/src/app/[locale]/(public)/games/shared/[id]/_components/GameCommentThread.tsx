'use client';

import { useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { GameCommentItem } from '@/lib/db/game-comments';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  addGameCommentAction,
  deleteGameCommentAction,
  editGameCommentAction,
} from '../_actions/game-comments';
import { buildGameCommentTree, groupReplies } from '../_lib/game-comment-tree';
import { GameCommentProvider, type MutationResult } from './GameCommentContext';
import { GameCommentForm } from './GameCommentForm';
import { GameCommentNode } from './GameCommentNode';

export type CommentUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type Props = {
  gameId: string;
  /** Move the thread is anchored to (0-based ply). */
  currentPly: number;
  /** All comments for the game (every ply); filtered to `currentPly` here. */
  comments: GameCommentItem[];
  currentUser: CommentUser | null;
  locale: Locale;
};

/**
 * The advice thread for the move currently on the board. Holds every comment
 * for the game in optimistic state (so adds / edits / deletes / replies reflect
 * instantly and survive move-to-move navigation while mounted), filters to the
 * current ply, and builds a Reddit-style tree rendered by `GameCommentNode` —
 * the same threaded UI as the topics / chunk comments.
 */
export function GameCommentThread({
  gameId,
  currentPly,
  comments: initialComments,
  currentUser,
  locale,
}: Props) {
  const t = useTranslations('sharedGames.comments');
  const [comments, setComments] = useState(initialComments);

  const localizeError = (code: string): string => {
    if (code === 'rateLimited') return t('errors.rateLimited');
    if (code === 'forbidden') return t('errors.forbidden');
    if (code === 'not_found') return t('errors.notFound');
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

  return (
    <div className="space-y-4">
      {roots.length > 0 && (
        <GameCommentProvider
          value={{ locale, currentUserId: currentUser?.id, reply, edit, remove }}
        >
          <div className="space-y-6">
            {roots.map((root) => (
              <GameCommentNode key={root.id} node={root} replyGroups={groupReplies(root)} />
            ))}
          </div>
        </GameCommentProvider>
      )}

      {/* Reddit-style collapsed CTA (shared with topics): the form mounts only
          after the reader opts in; guests get the shared sign-up prompt. */}
      <JoinConversationToggle count={commentCount} joinLabel={t('joinConversation')}>
        <GameCommentForm
          placeholder={t('placeholder')}
          submitLabel={t('submit')}
          submittingLabel={t('submitting')}
          autoFocus
          resetOnSuccess
          onSubmit={(body) => postComment(null, body)}
        />
      </JoinConversationToggle>
    </div>
  );
}
