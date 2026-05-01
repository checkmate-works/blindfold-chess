import type { ActionResult } from '@/lib/action-types';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { groupReplies } from '../_lib/comment-tree';
import { canUserReply } from '../_lib/permissions';
import { CommentNode } from './CommentNode';

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
  createReplyAction: CreateReplyAction;
  deletePostAction: DeletePostAction;
  i18n: {
    likeNamespace: string;
    replyNamespace: string;
    deleteNamespace: string;
  };
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
  createReplyAction,
  deletePostAction,
  i18n,
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
          rootPostId={root.id}
          replyGroups={groupReplies(root)}
          locale={locale}
          topicKey={topicKey}
          currentUserId={currentUserId}
          canReply={canReplyByRootId.get(root.id) ?? false}
          enableSpoiler={enableSpoiler}
          redirectPath={redirectPath}
          toggleLikeAction={toggleLikeAction}
          createReplyAction={createReplyAction}
          deletePostAction={deletePostAction}
          i18n={i18n}
        />
      ))}
    </div>
  );
}
