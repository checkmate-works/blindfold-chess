'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEyeSlash } from 'react-icons/fa';

import type { ActionResult } from '@/lib/action-types';

import { LinkedText } from '@/app/[locale]/_components/LinkedText';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { countDescendants } from '../_lib/comment-tree';
import { DeletePostButton } from './DeletePostButton';
import { LikeButton } from './LikeButton';
import { ReplyForm } from './ReplyForm';
import { UserAvatar } from './UserAvatar';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type DeletePostAction = (postId: string, locale: string) => Promise<ActionResult>;

type CreateReplyAction = (
  locale: string,
  topicKey: string,
  postId: string,
  prevState: { error?: string },
  formData: FormData
) => Promise<{ error?: string }>;

type I18n = {
  likeNamespace: string;
  replyNamespace: string;
  deleteNamespace: string;
};

type Props = {
  node: CommentTreeNode;
  /**
   * The top-level post ID for the thread this node belongs to. Passed to
   * `ReplyForm` as the `postId` argument so `createReplyBase` can resolve
   * the reply target via `replyToId` (the immediate parent) versus
   * `postId` (the thread root).
   */
  rootPostId: string;
  locale: string;
  topicKey: string;
  currentUserId?: string;
  /**
   * Whether the *current user* can reply within this thread, derived from the
   * top-level post's `replyPermission`. Computed once per root by the
   * server parent and passed down — every node in the same thread shares
   * the same answer (replyPermission lives on the root, not per reply).
   */
  canReply: boolean;
  enableSpoiler: boolean;
  redirectPath: string;
  toggleLikeAction: ToggleLikeAction;
  createReplyAction: CreateReplyAction;
  deletePostAction: DeletePostAction;
  i18n: I18n;
  /**
   * Zero-based depth: 0 = top-level comment, 1 = first reply, etc. Used to
   * stop adding visual indentation past `MAX_INDENT_DEPTH` so the layout
   * does not break on narrow screens — siblings beyond that depth still
   * nest in the DOM (and continue to draw the border-left guide), but the
   * left padding is held constant. Mirrors Reddit's "soft cap" behavior:
   * the data is unlimited, the indentation is not.
   */
  depth?: number;
};

/**
 * Visual cap for nested-reply indentation. Reddit caps around ~6–9 depending
 * on viewport; 8 is a middle-of-the-road default that holds up on a 360px
 * mobile viewport when each level adds `pl-4` (~16px).
 */
const MAX_INDENT_DEPTH = 8;

export function CommentNode({
  node,
  rootPostId,
  locale,
  topicKey,
  currentUserId,
  canReply,
  enableSpoiler,
  redirectPath,
  toggleLikeAction,
  createReplyAction,
  deletePostAction,
  i18n,
  depth = 0,
}: Props) {
  const tTopics = useTranslations('topics');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);

  const displayName = node.author?.displayName || node.author?.username || 'Anonymous';
  const profileHref = node.author?.username ? `/u/${node.author.username}` : null;

  const showSpoiler = enableSpoiler && node.isSpoiler && !isSpoilerRevealed;
  const isOwnComment = currentUserId !== undefined && currentUserId === node.userId;
  const descendantCount = countDescendants(node);

  return (
    <div id={`post-${node.id}`} className="scroll-mt-20">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={tTopics(isCollapsed ? 'expandAriaLabel' : 'collapseAriaLabel')}
          aria-expanded={!isCollapsed}
          className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground border border-border rounded cursor-pointer"
        >
          {isCollapsed ? '+' : '−'}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <UserAvatar
            profileHref={profileHref}
            avatarUrl={node.author?.avatarUrl}
            displayName={displayName}
            locale={locale}
            flair={node.author?.flair}
            country={node.author?.country}
          >
            <time dateTime={node.createdAt.toISOString()} className="text-xs text-muted-foreground">
              {node.createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </UserAvatar>

          {isCollapsed ? (
            descendantCount > 0 && (
              <p className="text-xs text-muted-foreground italic">
                {tTopics('hiddenReplies', { count: descendantCount })}
              </p>
            )
          ) : (
            <>
              <div className="relative" aria-live="polite">
                <p
                  className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed"
                  aria-hidden={showSpoiler || undefined}
                >
                  <LinkedText text={node.content} locale={locale} />
                </p>
                {showSpoiler && (
                  <button
                    type="button"
                    onClick={() => setIsSpoilerRevealed(true)}
                    aria-label={tTopics('spoiler.overlayAriaLabel')}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-sm bg-muted text-muted-foreground hover:bg-muted/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <FaEyeSlash aria-hidden="true" />
                      {tTopics('spoiler.overlayTitle')}
                    </span>
                    <span className="text-xs text-muted-foreground/80">
                      {tTopics('spoiler.overlayHint')}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <LikeButton
                  postId={node.id}
                  locale={locale}
                  topicKey={topicKey}
                  initialLikeCount={node.likeMeta.likeCount}
                  initialLikedByMe={node.likeMeta.likedByMe}
                  toggleLikeAction={toggleLikeAction}
                  i18nNamespace={i18n.likeNamespace}
                />
                {canReply && currentUserId !== undefined && (
                  <button
                    type="button"
                    onClick={() => setIsReplyOpen((prev) => !prev)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {tTopics('replyButton')}
                  </button>
                )}
                {isOwnComment && (
                  <DeletePostButton
                    postId={node.id}
                    locale={locale}
                    redirectPath={redirectPath}
                    deletePostAction={deletePostAction}
                    i18nNamespace={i18n.deleteNamespace}
                  />
                )}
              </div>

              {isReplyOpen && (
                <div className="mt-2">
                  <ReplyForm
                    locale={locale}
                    topicKey={topicKey}
                    postId={rootPostId}
                    createReplyAction={createReplyAction}
                    i18nNamespace={i18n.replyNamespace}
                    replyToId={node.id}
                    replyToUsername={displayName}
                    onCancelReply={() => setIsReplyOpen(false)}
                    enableSpoilerToggle={enableSpoiler}
                  />
                </div>
              )}

              {node.children.length > 0 && (
                <div
                  className={`mt-3 border-l-2 border-border space-y-4 ${
                    depth < MAX_INDENT_DEPTH ? 'pl-4' : 'pl-0'
                  }`}
                >
                  {node.children.map((child) => (
                    <CommentNode
                      key={child.id}
                      node={child}
                      rootPostId={rootPostId}
                      locale={locale}
                      topicKey={topicKey}
                      currentUserId={currentUserId}
                      canReply={canReply}
                      enableSpoiler={enableSpoiler}
                      redirectPath={redirectPath}
                      toggleLikeAction={toggleLikeAction}
                      createReplyAction={createReplyAction}
                      deletePostAction={deletePostAction}
                      i18n={i18n}
                      depth={depth + 1}
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
