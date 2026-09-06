import type { PostWithReplyMeta } from '../shared';

/**
 * A `PostWithReplyMeta` with every field filled in, for tests whose subject is
 * one narrow slice of it.
 *
 * `PostWithReplyMeta` is a joined row — a `topic_posts` row, its author, its
 * reply counts and its like counts — so building one inline costs eighteen
 * lines of which two matter. Two suites had written those eighteen out, and a
 * field added to the row type would break both in the same way at once.
 *
 * The defaults describe an ordinary live post: not deleted, no replies, no
 * likes, open to everyone, no author profile attached.
 */
export function makePost(overrides: Partial<PostWithReplyMeta> = {}): PostWithReplyMeta {
  return {
    id: 'post-1',
    userId: 'user-1',
    topicType: 'square',
    topicKey: 'e4',
    parentId: null,
    rootPostId: null,
    content: 'content',
    replyPermission: 'everyone',
    isSpoiler: false,
    imageAttachmentCount: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    deletedAt: null,
    author: null,
    replyMeta: { replyCount: 0, latestReplyAt: null, repliers: [], uniqueReplierCount: 0 },
    likeMeta: { likeCount: 0, likedByMe: false },
    ...overrides,
  };
}
