import type { TopicType } from './constants';

export type ReplyNotificationPlan = {
  /** `null` for an anonymised author — `createNotification` no-ops on it. */
  userId: string | null;
  type: 'new_comment_on_topic' | 'reply';
};

/**
 * Who a new reply notifies, and as which notification type.
 *
 * The replied-to author is notified unless they wrote the reply. For a
 * reply-to-reply the thread owner (the root post's author) is notified too,
 * unless they wrote the reply or were already notified as the replied-to
 * author.
 *
 * On /topics (opening/square) the root topic_post is itself authored
 * content, so anything landing in its thread is "a comment on your post"
 * for the post author — the mutable 'new_comment_on_topic' type, same as
 * comments on positions/chunks/repertoires. Everywhere else the root post
 * is already a comment on some other entity (whose owner was notified via
 * notifyTopicAuthorOfNewComment when it was created), so replies stay the
 * person-to-person 'reply' type, which is deliberately not mutable.
 */
export function planReplyNotifications({
  topicType,
  actorId,
  parentId,
  rootPostId,
  notifyUserId,
  rootPostAuthorId,
}: {
  topicType: TopicType;
  actorId: string;
  parentId: string;
  rootPostId: string;
  notifyUserId: string | null;
  rootPostAuthorId: string | null;
}): ReplyNotificationPlan[] {
  const rootIsAuthoredPost = topicType === 'opening' || topicType === 'square';
  const isNestedReply = parentId !== rootPostId;
  const plans: ReplyNotificationPlan[] = [];

  if (notifyUserId !== actorId) {
    plans.push({
      userId: notifyUserId,
      // A direct reply to the top-level post notifies its author; on
      // authored-post topics that is a comment on their content.
      type: rootIsAuthoredPost && !isNestedReply ? 'new_comment_on_topic' : 'reply',
    });
  }

  if (isNestedReply && rootPostAuthorId !== actorId && rootPostAuthorId !== notifyUserId) {
    plans.push({
      userId: rootPostAuthorId,
      // For the post author, activity anywhere in their post's thread is
      // still "a comment on your post"; for a comment author (positions
      // etc.) it is thread-reply noise, kept as 'reply'.
      type: rootIsAuthoredPost ? 'new_comment_on_topic' : 'reply',
    });
  }

  return plans;
}
