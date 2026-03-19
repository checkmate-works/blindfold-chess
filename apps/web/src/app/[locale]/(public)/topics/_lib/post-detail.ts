import type { User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

import { canUserReply } from './permissions';
import type { LikeMeta, PostWithReplyMeta, TopicPostWithAuthor } from './queries';
import { getLikeMetaForPost, getRepliesByPostId } from './queries';

export type PostDetailData = {
  user: User | null;
  replies: PostWithReplyMeta[];
  likeMeta: LikeMeta;
  isAuthor: boolean;
  canReply: boolean;
};

/**
 * Fetch shared data needed by both opening and square post detail pages.
 * Handles auth, replies, likes, and reply permission in one call.
 */
export async function fetchPostDetailData(
  postId: string,
  post: TopicPostWithAuthor
): Promise<PostDetailData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [replies, likeMeta] = await Promise.all([
    getRepliesByPostId(postId, user?.id),
    getLikeMetaForPost(postId, user?.id),
  ]);

  const isAuthor = user?.id === post.userId;
  const canReply = await canUserReply({
    userId: user?.id,
    postUserId: post.userId,
    replyPermission: post.replyPermission,
  });

  return { user, replies, likeMeta, isAuthor, canReply };
}
