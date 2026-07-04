'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { formatAbsoluteDateTime } from '@/app/[locale]/(public)/topics/_lib/absolute-time';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import type { FlatReply, GameCommentTreeNode, ReplyGroup } from '../_lib/game-comment-tree';
import { GameCommentBody } from './GameCommentBody';
import { useGameCommentContext } from './GameCommentContext';
import { GameCommentForm } from './GameCommentForm';
import { GameCommentLikeButton } from './GameCommentLikeButton';

type Props = {
  node: GameCommentTreeNode;
  /** Provided only on a thread root: its first-level replies + their flattened descendants. */
  replyGroups?: ReplyGroup[];
  /** Provided only on a first-level reply: its descendants, rendered at the second indent. */
  flatReplies?: FlatReply[];
  /** "@<name>" cue for a deeper reply whose parent is not the first-level reply. */
  replyToDisplayName?: string;
};

/**
 * One comment in the game-comment thread — the game-side counterpart to the
 * topics `CommentNode`. Same layout and affordances (collapse on roots,
 * tombstones for deleted nodes that still anchor replies, avatar + timestamp +
 * "(edited)", like / reply / edit / delete, two-indent nested replies), minus
 * the topics-only spoiler / attachment paths. Thread-wide handlers come from
 * context; the optimistic state lives in the thread, so this reads from props.
 */
export function GameCommentNode({ node, replyGroups, flatReplies, replyToDisplayName }: Props) {
  const { locale, currentUserId, reply, edit, remove, moves, startingFen, playerColor } =
    useGameCommentContext();
  const t = useTranslations('sharedGames.comments');
  const tCommon = useTranslations('Common');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isDeleted = node.deletedAt !== null;
  const displayName = node.author?.displayName || node.author?.username || tCommon('deletedUser');
  const profileHref = node.author?.username ? `/u/${node.author.username}` : null;
  const isOwnComment = !isDeleted && currentUserId !== undefined && currentUserId === node.authorId;
  const wasEdited = node.updatedAt.getTime() > node.createdAt.getTime();
  const isRoot = replyGroups !== undefined;
  const hiddenReplyCount =
    replyGroups?.reduce((acc, group) => acc + 1 + group.deeper.length, 0) ?? 0;

  async function handleDelete() {
    setDeletePending(true);
    setDeleteError(null);
    const result = await remove(node.id);
    setDeletePending(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteOpen(false);
  }

  return (
    <div id={`game-comment-${node.id}`} className="scroll-mt-20">
      <div className="flex items-start gap-2">
        {isRoot && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={t(isCollapsed ? 'expandAriaLabel' : 'collapseAriaLabel')}
            aria-expanded={!isCollapsed}
            className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground border border-border rounded cursor-pointer"
          >
            {isCollapsed ? '+' : '−'}
          </button>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          {isDeleted ? (
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground italic">
              <span>{t('deletedComment')}</span>
              <time dateTime={node.createdAt.toISOString()} className="not-italic">
                {formatAbsoluteDateTime(node.createdAt, locale, 'short')}
              </time>
            </div>
          ) : (
            <UserAvatar
              profileHref={profileHref}
              avatarUrl={node.author?.avatarUrl}
              displayName={displayName}
              locale={locale}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <time dateTime={node.createdAt.toISOString()}>
                  {formatAbsoluteDateTime(node.createdAt, locale, 'short')}
                </time>
                {wasEdited && (
                  <abbr
                    title={t('editedTitle', {
                      date: formatAbsoluteDateTime(node.updatedAt, locale, 'short'),
                    })}
                    className="italic no-underline"
                  >
                    {t('editedLabel')}
                  </abbr>
                )}
              </div>
            </UserAvatar>
          )}

          {isCollapsed ? (
            hiddenReplyCount > 0 && (
              <p className="text-xs text-muted-foreground italic">
                {t('hiddenReplies', { count: hiddenReplyCount })}
              </p>
            )
          ) : (
            <>
              {!isDeleted && isEditing ? (
                <GameCommentForm
                  variant="edit"
                  initialValue={node.body}
                  autoFocus
                  submitLabel={t('save')}
                  submittingLabel={t('saving')}
                  cancelLabel={t('cancel')}
                  onCancel={() => setIsEditing(false)}
                  onSubmit={async (body) => {
                    const result = await edit(node.id, body);
                    if (!result.error) setIsEditing(false);
                    return result;
                  }}
                />
              ) : (
                !isDeleted && (
                  <div aria-live="polite">
                    {replyToDisplayName && (
                      <p className="text-sm font-medium text-primary mb-1">@{replyToDisplayName}</p>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                      <GameCommentBody
                        text={node.body}
                        locale={locale}
                        moves={moves}
                        startingFen={startingFen}
                        playerColor={playerColor}
                      />
                    </p>
                  </div>
                )
              )}

              {!isDeleted && !isEditing && (
                <div className="flex items-center gap-4">
                  <GameCommentLikeButton
                    commentId={node.id}
                    locale={locale}
                    initialLikeCount={node.likeCount}
                    initialLikedByMe={node.likedByMe}
                  />
                  {currentUserId !== undefined && (
                    <button
                      type="button"
                      onClick={() => setIsReplyOpen((prev) => !prev)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {t('reply')}
                    </button>
                  )}
                  {isOwnComment && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {t('edit')}
                    </button>
                  )}
                  {isOwnComment && (
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      {t('delete')}
                    </button>
                  )}
                </div>
              )}

              {isReplyOpen && (
                <div className="mt-2">
                  <GameCommentForm
                    autoFocus
                    placeholder={t('replyPlaceholder')}
                    submitLabel={t('replySubmit')}
                    submittingLabel={t('submitting')}
                    header={
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t('replyingTo', { name: displayName })}</span>
                        <button
                          type="button"
                          onClick={() => setIsReplyOpen(false)}
                          aria-label={t('cancelReply')}
                          className="hover:text-foreground transition-colors"
                        >
                          &times;
                        </button>
                      </div>
                    }
                    onSubmit={async (body) => {
                      const result = await reply(node.id, body);
                      if (!result.error) setIsReplyOpen(false);
                      return result;
                    }}
                  />
                </div>
              )}

              {replyGroups && replyGroups.length > 0 && (
                <div className="mt-3 border-l-2 border-border pl-4 space-y-4">
                  {replyGroups.map((group) => (
                    <GameCommentNode
                      key={group.first.id}
                      node={group.first}
                      flatReplies={group.deeper}
                    />
                  ))}
                </div>
              )}

              {flatReplies && flatReplies.length > 0 && (
                <div className="mt-3 border-l-2 border-border pl-4 space-y-4">
                  {flatReplies.map(({ node: replyNode, replyToDisplayName: prefix }) => (
                    <GameCommentNode
                      key={replyNode.id}
                      node={replyNode}
                      replyToDisplayName={prefix ?? undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteOpen}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteBody')}
        confirmText={t('confirmDelete')}
        cancelText={t('confirmCancel')}
        confirmVariant="danger"
        isLoading={deletePending}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
