'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';
import { LinkedText } from '@/app/[locale]/_components/LinkedText';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import { formatAbsoluteDateTime } from '../_lib/absolute-time';
import type { CommentTreeNode, FlatReply, ReplyGroup } from '../_lib/comment-tree';
import { CommentActions } from './CommentActions';
import { CommentMoveBody } from './CommentMoveBody';
import { CommentSpoilerOverlay } from './CommentSpoilerOverlay';
import { useCommentTreeContext } from './CommentTreeContext';
import { EditPostForm } from './EditPostForm';
import { EditableAttachments } from './EditableAttachments';
import { EditedIndicator } from './EditedIndicator';
import { ReplyForm } from './ReplyForm';

type Props = {
  node: CommentTreeNode;
  /**
   * Reply groups for a thread root. Provided ONLY when this node is the
   * thread root: `CommentTree` calls `groupReplies(root)` and passes the
   * result here. Each group is one direct reply to the root, rendered with
   * one indent, plus that reply's own descendants flattened DFS-pre-order to
   * render with two indents — never deeper. This is the structural cap on
   * nesting: even a reply chain 20 levels deep renders as at most two
   * visual indents.
   */
  replyGroups?: ReplyGroup[];
  /**
   * Pre-flattened deeper replies. Provided ONLY on a first-level reply — the
   * direct reply to the thread root. Each entry is rendered as a sibling
   * under the first-level reply (the second indent level). When `undefined`,
   * this node is either the root (use `replyGroups` instead) or a deeper
   * reply (renders no descendants of its own).
   */
  flatReplies?: FlatReply[];
  /**
   * The immediate parent's display name, set on deeper replies whose parent
   * is NOT the first-level reply. Renders as "@<name>" above the body so the
   * "in reply to" cue survives the flattening at the deepest level. Omitted
   * on the root, on first-level replies (their parent IS the root), and on
   * deeper replies whose parent IS the first-level reply (placement is the
   * cue).
   */
  replyToDisplayName?: string;
};

export function CommentNode({ node, replyGroups, flatReplies, replyToDisplayName }: Props) {
  // Thread-wide values (root id, locale, Server Actions, i18n, attachment
  // maps) come from context — see CommentTreeContext for why they are not
  // threaded through props.
  const {
    rootPostId,
    locale,
    topicKey,
    currentUserId,
    enableSpoiler,
    replyAttachmentActions,
    editPostAction,
    removeAttachmentAction,
    attachPgnAction,
    attachFenAction,
    attachmentsByPostId,
    attachmentFallbackVideoTitle,
    i18n,
    extraContentByPostId,
    moveNotationFen,
    moveNotationLine,
  } = useCommentTreeContext();

  const tTopics = useTranslations('topics');
  const tCommon = useTranslations('Common');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Local-state mirror of the comment fields that the in-place edit
  // form can change. Initialised from the server-rendered `node` and
  // updated on successful save so the UI swaps to the fresh text
  // without a router round-trip.
  const [localContent, setLocalContent] = useState(node.content);
  const [localIsSpoiler, setLocalIsSpoiler] = useState(node.isSpoiler);
  const [localUpdatedAt, setLocalUpdatedAt] = useState<Date>(new Date(node.updatedAt));

  const isDeleted = node.deletedAt !== null;
  const displayName = node.author?.displayName || node.author?.username || tCommon('deletedUser');
  const profileHref = node.author?.username ? `/u/${node.author.username}` : null;

  // Tombstones never run spoiler / like / reply / delete affordances — those
  // are anchored to the (deleted) author and would either leak identity or
  // act on a row the author has already retracted.
  const showSpoiler = !isDeleted && enableSpoiler && localIsSpoiler && !isSpoilerRevealed;
  const isOwnComment = !isDeleted && currentUserId !== undefined && currentUserId === node.userId;
  const wasEdited = localUpdatedAt.getTime() > new Date(node.createdAt).getTime();
  const isRoot = replyGroups !== undefined;
  // The "N replies hidden" label needs to match what collapsing actually
  // hides. On the root, that is every first-level reply plus every deeper
  // reply they own — i.e. the total descendant count, summed across groups.
  // On non-root nodes, collapse is unavailable so the count is unused.
  const hiddenReplyCount =
    replyGroups?.reduce((acc, group) => acc + 1 + group.deeper.length, 0) ?? 0;

  return (
    <div id={`post-${node.id}`} className="scroll-mt-20">
      <div className="flex items-start gap-2">
        {isRoot && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={tTopics(isCollapsed ? 'expandAriaLabel' : 'collapseAriaLabel')}
            aria-expanded={!isCollapsed}
            className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground border border-border rounded cursor-pointer"
          >
            {isCollapsed ? '+' : '−'}
          </button>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          {isDeleted ? (
            // Tombstone: hide avatar, displayName, profile link, country, and
            // flair so a deleted comment cannot be traced back to its author.
            // Keep the timestamp — it's not identifying and helps readers
            // place the deletion in the conversation flow.
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground italic">
              <span>{tTopics('deletedComment')}</span>
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
              flair={node.author?.flair}
              country={node.author?.country}
            >
              {/*
                Wrap the timestamp in a block-level <div> so it lands below the
                displayName instead of running inline next to it. UserAvatar
                renders the displayName in a `inline-flex` <span>, so a bare
                <time> child would flow on the same line — matching that to
                `BaseTopicPostCard`, which wraps its timestamp in a <div> for
                the same reason.
              */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <time dateTime={node.createdAt.toISOString()}>
                  {formatAbsoluteDateTime(node.createdAt, locale, 'short')}
                </time>
                {wasEdited && <EditedIndicator updatedAt={localUpdatedAt} locale={locale} />}
              </div>
            </UserAvatar>
          )}

          {isCollapsed ? (
            hiddenReplyCount > 0 && (
              <p className="text-xs text-muted-foreground italic">
                {tTopics('hiddenReplies', { count: hiddenReplyCount })}
              </p>
            )
          ) : (
            <>
              {!isDeleted && isEditing && editPostAction ? (
                <>
                  <EditPostForm
                    postId={node.id}
                    locale={locale}
                    initialContent={localContent}
                    initialIsSpoiler={localIsSpoiler}
                    enableSpoilerToggle={enableSpoiler}
                    editPostAction={editPostAction}
                    onSaved={(next) => {
                      setLocalContent(next.content);
                      setLocalIsSpoiler(next.isSpoiler);
                      setLocalUpdatedAt(next.updatedAt);
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                  {removeAttachmentAction &&
                    (attachmentsByPostId?.get(node.id) ||
                      attachPgnAction !== undefined ||
                      attachFenAction !== undefined) && (
                      <EditableAttachments
                        postId={node.id}
                        locale={locale}
                        attachment={attachmentsByPostId?.get(node.id) ?? null}
                        removeAttachmentAction={removeAttachmentAction}
                        attachPgnAction={attachPgnAction}
                        attachFenAction={attachFenAction}
                        fallbackVideoTitle={attachmentFallbackVideoTitle ?? ''}
                      />
                    )}
                </>
              ) : (
                !isDeleted && (
                  <div className="relative" aria-live="polite">
                    {replyToDisplayName && (
                      <p className="text-sm font-medium text-primary mb-1">@{replyToDisplayName}</p>
                    )}
                    <p
                      className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed"
                      aria-hidden={showSpoiler || undefined}
                    >
                      {moveNotationLine ? (
                        <GameCommentBody
                          text={localContent}
                          locale={locale}
                          moves={moveNotationLine.moves}
                          startingFen={moveNotationLine.startingFen}
                          playerColor={moveNotationLine.playerColor}
                        />
                      ) : moveNotationFen ? (
                        <CommentMoveBody
                          text={localContent}
                          locale={locale}
                          fen={moveNotationFen}
                        />
                      ) : (
                        <LinkedText text={localContent} locale={locale} />
                      )}
                    </p>
                    {showSpoiler && (
                      <CommentSpoilerOverlay onReveal={() => setIsSpoilerRevealed(true)} />
                    )}
                  </div>
                )
              )}

              {!isDeleted && !isEditing && extraContentByPostId?.get(node.id)}

              {!isDeleted && !isEditing && (
                <CommentActions
                  node={node}
                  isOwnComment={isOwnComment}
                  onReply={() => setIsReplyOpen((prev) => !prev)}
                  onEdit={() => setIsEditing(true)}
                />
              )}

              {isReplyOpen && (
                <div className="mt-2">
                  <ReplyForm
                    locale={locale}
                    topicKey={topicKey}
                    postId={rootPostId}
                    attachmentActions={replyAttachmentActions}
                    i18nNamespace={i18n.replyNamespace}
                    replyToId={node.id}
                    replyToUsername={displayName}
                    onCancelReply={() => setIsReplyOpen(false)}
                    enableSpoilerToggle={enableSpoiler}
                  />
                </div>
              )}

              {replyGroups && replyGroups.length > 0 && (
                <div className="mt-3 border-l-2 border-border pl-4 space-y-4">
                  {replyGroups.map((group) => (
                    <CommentNode
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
                    <CommentNode
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
    </div>
  );
}
