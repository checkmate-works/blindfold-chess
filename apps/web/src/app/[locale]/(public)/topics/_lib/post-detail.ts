import type { User } from '@supabase/supabase-js';

import { getOptionalUser } from '@/lib/auth';

import { canUserReply } from './permissions';
import { attachPostMeta } from './post-meta';
import { getRepliesByPostId } from './queries';
import type { PostWithReplyMeta, TopicPostWithAuthor } from './shared';

export type PostDetailData = {
  user: User | null;
  /**
   * The OP enriched with `likeMeta` + `replyMeta` so it can be fed into
   * `buildCommentTree` alongside its replies and rendered as the single
   * root of a `CommentNode` thread (matches puzzle / position-memory).
   */
  rootWithMeta: PostWithReplyMeta;
  replies: PostWithReplyMeta[];
  isAuthor: boolean;
  canReply: boolean;
};

/**
 * Fetch shared data needed by every topic post detail page (openings,
 * squares, chunks). Returns the OP with full meta + all descendants in one
 * call so the page can build a single-root `CommentTreeNode` and render via
 * `CommentNode`.
 */
export async function fetchPostDetailData(
  postId: string,
  post: TopicPostWithAuthor
): Promise<PostDetailData> {
  const user = await getOptionalUser();

  const [replies, [rootWithMeta]] = await Promise.all([
    getRepliesByPostId(postId, user?.id),
    attachPostMeta([post], user?.id),
  ]);

  const isAuthor = user?.id === post.userId;
  const canReply = await canUserReply({
    userId: user?.id,
    postUserId: post.userId,
    replyPermission: post.replyPermission,
  });

  return { user, rootWithMeta, replies, isAuthor, canReply };
}
