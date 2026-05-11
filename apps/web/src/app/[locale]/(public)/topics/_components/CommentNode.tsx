'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEyeSlash } from 'react-icons/fa';

import type { ActionResult } from '@/lib/action-types';
import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { LinkedText } from '@/app/[locale]/_components/LinkedText';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import type { AttachmentKind } from '../_actions/removePostAttachment';
import { formatAbsoluteDateTime } from '../_lib/absolute-time';
import type { CommentTreeNode, FlatReply, ReplyGroup } from '../_lib/comment-tree';
import { DeletePostButton } from './DeletePostButton';
import { EditPostForm } from './EditPostForm';
import { EditableAttachments } from './EditableAttachments';
import { EditedIndicator } from './EditedIndicator';
import { LikeButton } from './LikeButton';
import { ReplyForm } from './ReplyForm';
import type { ReplyAttachmentActions } from './ReplyForm';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type DeletePostAction = (postId: string, locale: string) => Promise<ActionResult>;

type EditPostAction = (
  postId: string,
  locale: string,
  formData: FormData
) => Promise<
  { success: true; content: string; isSpoiler: boolean; updatedAt: Date } | { error: string }
>;

type RemoveAttachmentAction = (
  postId: string,
  attachmentId: string,
  kind: AttachmentKind,
  locale: string
) => Promise<{ success: true } | { error: string }>;

type AttachAction = (
  postId: string,
  locale: string,
  formData: FormData
) => Promise<{ success: true; attachment: { id: string } } | { error: string }>;

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
  /**
   * Attachment-aware reply Server Actions (PGN + FEN). The inline
   * `ReplyForm` rendered inside this node binds these against the
   * thread's `(locale, topicKey, rootPostId)` and dispatches between
   * the two based on the AttachmentModal's selected kind.
   */
  replyAttachmentActions: ReplyAttachmentActions;
  deletePostAction: DeletePostAction;
  /**
   * In-place edit Server Action. Optional so a page can roll out the edit
   * affordance incrementally; when omitted, the Edit button does not render
   * and the comment is read-only (matching the pre-edit contract). When
   * provided, the author of a comment sees an "Edit" button next to
   * "Delete" and can rewrite the body inline.
   */
  editPostAction?: EditPostAction;
  /**
   * Optional attachment-remove Server Action. When provided alongside an
   * `attachment` for this node, the in-place edit form surfaces a
   * "Remove attachment" affordance (per-image for 1:N images, single for
   * the 1:0..1 kinds). The action is gated on author ownership server-
   * side; the UI gate here is purely a redundancy.
   */
  removeAttachmentAction?: RemoveAttachmentAction;
  /**
   * Optional edit-flow attach actions. Forwarded to `EditableAttachments`
   * so a node whose post currently has NO attachment can surface an
   * "Add attachment" button (paperclip → AttachmentModal). Omitting both
   * keeps edit mode as remove-only for that surface.
   */
  attachPgnAction?: AttachAction;
  attachFenAction?: AttachAction;
  /**
   * Raw attachment payloads keyed by post id. Threaded all the way down
   * the recursion (like `extraContentByPostId`) so each `CommentNode`
   * can look up its own attachment in edit mode. Read-mode rendering
   * still flows through `extraContentByPostId` — pages already compute
   * the per-post lookup once via `getAttachmentsForPosts`, so passing
   * the raw map here is essentially free.
   */
  attachmentsByPostId?: ReadonlyMap<string, PostAttachment>;
  /**
   * Fallback title for `<AttachedVideoCard>` inside `EditableAttachments`.
   * Only consulted when the node's attachment kind is `video` and edit
   * mode is active. Pages already resolve the i18n string for the read-
   * side renderer (`renderAttachment`); threading it here lets the edit-
   * side EditableAttachments reuse the same value without a second
   * `useTranslations` lookup.
   */
  attachmentFallbackVideoTitle?: string;
  i18n: I18n;
  /**
   * Reply groups for a thread root. Provided ONLY when this node is the
   * thread root: the server-side parent (`CommentTree`) calls
   * `groupReplies(root)` and passes the result here. Each group is one
   * direct reply to the root (the "first-level reply"), rendered with one
   * indent, plus all of that reply's own descendants flattened DFS-pre-order
   * to render with two indents — never deeper. This is the structural cap
   * on nesting: even a reply chain 20 levels deep in the data renders as
   * at most two visual indents.
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
  /**
   * Per-post extra payload, looked up by post id and rendered between the
   * body and the like/reply row. Used to surface attached game / FEN /
   * embed cards on every node in the tree — both top-level posts (chunks
   * list page) and replies (every detail page that shows reply
   * attachments under their author). The Map is threaded all the way down
   * the recursion so first- and second-level replies render their
   * attachment too.
   *
   * @design Why a Map and not a pre-resolved ReactNode prop
   *
   * Pre-resolving at `CommentTree` and passing one ReactNode per CommentNode
   * would force the parent to walk the full tree to discover descendant
   * ids; threading a Map keeps the discovery local to each node and lets
   * the pages compute the attachment payload from a flat
   * `getAttachmentsForPosts(allPostIds)` call.
   */
  extraContentByPostId?: ReadonlyMap<string, React.ReactNode>;
};

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
  replyAttachmentActions,
  deletePostAction,
  editPostAction,
  removeAttachmentAction,
  attachPgnAction,
  attachFenAction,
  attachmentsByPostId,
  attachmentFallbackVideoTitle,
  i18n,
  replyGroups,
  flatReplies,
  replyToDisplayName,
  extraContentByPostId,
}: Props) {
  const tTopics = useTranslations('topics');
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
  const displayName = node.author?.displayName || node.author?.username || 'Anonymous';
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
                      <LinkedText text={localContent} locale={locale} />
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
                )
              )}

              {!isDeleted && !isEditing && extraContentByPostId?.get(node.id)}

              {!isDeleted && !isEditing && (
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
                  {isOwnComment && editPostAction && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {tTopics('edit.button')}
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
                      rootPostId={rootPostId}
                      locale={locale}
                      topicKey={topicKey}
                      currentUserId={currentUserId}
                      canReply={canReply}
                      enableSpoiler={enableSpoiler}
                      redirectPath={redirectPath}
                      toggleLikeAction={toggleLikeAction}
                      replyAttachmentActions={replyAttachmentActions}
                      deletePostAction={deletePostAction}
                      editPostAction={editPostAction}
                      removeAttachmentAction={removeAttachmentAction}
                      attachPgnAction={attachPgnAction}
                      attachFenAction={attachFenAction}
                      attachmentsByPostId={attachmentsByPostId}
                      attachmentFallbackVideoTitle={attachmentFallbackVideoTitle}
                      i18n={i18n}
                      flatReplies={group.deeper}
                      extraContentByPostId={extraContentByPostId}
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
                      rootPostId={rootPostId}
                      locale={locale}
                      topicKey={topicKey}
                      currentUserId={currentUserId}
                      canReply={canReply}
                      enableSpoiler={enableSpoiler}
                      redirectPath={redirectPath}
                      toggleLikeAction={toggleLikeAction}
                      replyAttachmentActions={replyAttachmentActions}
                      deletePostAction={deletePostAction}
                      editPostAction={editPostAction}
                      removeAttachmentAction={removeAttachmentAction}
                      attachPgnAction={attachPgnAction}
                      attachFenAction={attachFenAction}
                      attachmentsByPostId={attachmentsByPostId}
                      attachmentFallbackVideoTitle={attachmentFallbackVideoTitle}
                      i18n={i18n}
                      replyToDisplayName={prefix ?? undefined}
                      extraContentByPostId={extraContentByPostId}
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
