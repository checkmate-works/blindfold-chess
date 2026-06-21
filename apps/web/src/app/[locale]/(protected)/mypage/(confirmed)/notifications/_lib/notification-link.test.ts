import { describe, expect, it } from 'vitest';

import { buildNotificationLink } from './notification-link';
import type { NotificationWithActor } from './queries';

function makeNotification(overrides: Partial<NotificationWithActor>): NotificationWithActor {
  return {
    id: 'n1',
    type: 'new_comment_on_topic',
    targetType: 'topic_post',
    targetId: 'p1',
    groupKey: null,
    metadata: null,
    isRead: false,
    createdAt: new Date('2026-06-21T00:00:00Z'),
    actor: { username: 'alice', displayName: 'Alice', avatarUrl: null },
    ...overrides,
  };
}

describe('buildNotificationLink — chunk comment deep links', () => {
  it('points a top-level chunk comment at the comments tab anchor', () => {
    const link = buildNotificationLink(
      makeNotification({
        type: 'new_comment_on_topic',
        metadata: { topicType: 'chunk', topicKey: 'notification-test', postId: 'post-1' },
      }),
      {}
    );
    // The comment tree only renders under `?tab=comments`; the param must come
    // before the `#post-` anchor for the page to open the right tab and scroll.
    expect(link).toBe('/chunks/notification-test?tab=comments#post-post-1');
  });

  it('points a chunk reply at the reply anchor (replyId wins over postId)', () => {
    const link = buildNotificationLink(
      makeNotification({
        type: 'reply',
        metadata: {
          topicType: 'chunk',
          topicKey: 'notification-test',
          postId: 'post-1',
          replyId: 'reply-9',
        },
      }),
      {}
    );
    expect(link).toBe('/chunks/notification-test?tab=comments#post-reply-9');
  });

  it('points a like on a chunk comment at the comments tab anchor', () => {
    // A like on a comment in the chunk thread is type 'like' +
    // targetType 'topic_post' with PostMetadata (topicType 'chunk'), so it
    // flows through `buildPostDetailUrl` — the same path as a new comment —
    // and must carry ?tab=comments, NOT the bare-chunk like branch below.
    const link = buildNotificationLink(
      makeNotification({
        type: 'like',
        targetType: 'topic_post',
        targetId: 'post-1',
        metadata: { topicType: 'chunk', topicKey: 'notification-test', postId: 'post-1' },
      }),
      {}
    );
    expect(link).toBe('/chunks/notification-test?tab=comments#post-post-1');
  });

  it('keeps a like on the chunk entity itself on the bare chunk URL (no tab param)', () => {
    const link = buildNotificationLink(
      makeNotification({
        type: 'like',
        targetType: 'chunk',
        targetId: 'chunk-id-1',
        metadata: { chunkId: 'chunk-id-1', slug: 'notification-test' },
      }),
      {}
    );
    expect(link).toBe('/chunks/notification-test');
  });
});
