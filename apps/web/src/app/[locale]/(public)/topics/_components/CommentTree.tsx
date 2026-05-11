import type { ActionResult } from '@/lib/action-types';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { groupReplies } from '../_lib/comment-tree';
import { canUserReply } from '../_lib/permissions';
import { CommentNode } from './CommentNode';
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

type Props = {
  /** Root nodes already built by `buildCommentTree`. */
  comments: CommentTreeNode[];
  locale: string;
  topicKey: string;
  /** `undefined` when the reader is anonymous — disables Reply / Delete affordances. */
  currentUserId?: string;
  enableSpoiler: boolean;
  redirectPath: string;
  toggleLikeAction: ToggleLikeAction;
  /**
   * Attachment-aware reply Server Actions (PGN + FEN). Forwarded to
   * every `CommentNode` so the inline `ReplyForm` it spawns can route
   * submits through the right base.
   */
  replyAttachmentActions: ReplyAttachmentActions;
  deletePostAction: DeletePostAction;
  /**
   * Optional in-place edit Server Action. When provided, every author-owned
   * `CommentNode` in the tree exposes an "Edit" button alongside "Delete".
   * Threading this through the tree (rather than letting `CommentNode`
   * import it directly) keeps the per-page wiring centralised in the page
   * component, matching the existing pattern for `deletePostAction` /
   * `toggleLikeAction`.
   */
  editPostAction?: EditPostAction;
  i18n: {
    likeNamespace: string;
    replyNamespace: string;
    deleteNamespace: string;
  };
  /**
   * Override the `rootPostId` passed down to every rendered `CommentNode`
   * (and through to the inline `ReplyForm` it spawns). Defaults to each
   * root's own id, which is correct when each entry in `comments` is
   * itself the head of an independent thread (e.g. position-memory /
   * puzzle, where every top-level comment owns its own URL hash anchor
   * and createReply redirect target).
   *
   * On topic post detail pages (`/topics/<family>/<key>/posts/<postId>`,
   * `/chunks/<slug>/posts/<postId>`) the actual thread root is the OP,
   * which is rendered separately above the tree; the entries in
   * `comments` are direct replies to the OP, promoted to roots for
   * layout purposes only. Their database `rootPostId` is still the
   * OP's id, and the createReply redirect must land on the OP's URL
   * (`/posts/${OP.id}`), not on `/posts/${reply.id}`. Pass the OP's id
   * here so the inline ReplyForm binds the right `postId` and the
   * redirect resolves to a URL whose page actually contains the new
   * reply.
   */
  threadRootPostId?: string;
  /**
   * Per-post extra payload, keyed by ANY post id in the tree (root or
   * descendant). Threaded through every `CommentNode` so an attached
   * game / FEN / embed card renders on top-level posts AND on replies.
   * Pages compute this via a single `getAttachmentsForPosts(allPostIds)`
   * call and `renderAttachment(...)` per entry. Posts without a matching
   * entry render nothing extra; existing callsites that omit the prop
   * are unaffected.
   */
  extraContentByPostId?: ReadonlyMap<string, React.ReactNode>;
};

/**
 * Server-rendered comment thread (three-level layout).
 *
 * Resolves per-root reply permission once on the server (reply permission
 * lives on the top-level post; every descendant inherits it), groups each
 * root's descendant tree by first-level reply via `groupReplies`, then hands
 * the root + reply groups to `CommentNode` (client) for collapse / spoiler-
 * reveal / inline reply-form state. Indentation is structurally capped at
 * two levels: a first-level reply gets one indent, everything deeper under
 * it gets a second indent and is flattened (with an "@<parent>" prefix when
 * the parent is not the first-level reply itself). The layout therefore
 * cannot break under deep reply chains, regardless of how deep the
 * underlying `parent_id` data goes.
 */
export async function CommentTree({
  comments,
  locale,
  topicKey,
  currentUserId,
  enableSpoiler,
  redirectPath,
  toggleLikeAction,
  replyAttachmentActions,
  deletePostAction,
  editPostAction,
  i18n,
  threadRootPostId,
  extraContentByPostId,
}: Props) {
  const canReplyByRootId = new Map<string, boolean>();
  await Promise.all(
    comments.map(async (root) => {
      const allowed = await canUserReply({
        userId: currentUserId,
        postUserId: root.userId,
        replyPermission: root.replyPermission,
      });
      canReplyByRootId.set(root.id, allowed);
    })
  );

  return (
    <div className="space-y-6">
      {comments.map((root) => (
        <CommentNode
          key={root.id}
          node={root}
          rootPostId={threadRootPostId ?? root.id}
          replyGroups={groupReplies(root)}
          locale={locale}
          topicKey={topicKey}
          currentUserId={currentUserId}
          canReply={canReplyByRootId.get(root.id) ?? false}
          enableSpoiler={enableSpoiler}
          redirectPath={redirectPath}
          toggleLikeAction={toggleLikeAction}
          replyAttachmentActions={replyAttachmentActions}
          deletePostAction={deletePostAction}
          editPostAction={editPostAction}
          i18n={i18n}
          extraContentByPostId={extraContentByPostId}
        />
      ))}
    </div>
  );
}
