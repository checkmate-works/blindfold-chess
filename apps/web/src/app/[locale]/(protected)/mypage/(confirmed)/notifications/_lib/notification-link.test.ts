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

// This file is the single source of truth for notification link *values*.
// `NotificationItem.test.tsx` mocks `buildNotificationLink` and only checks that
// the component renders a link vs. a button — it does not re-assert URLs.

describe('buildNotificationLink — follow', () => {
  it('links to the actor profile', () => {
    expect(
      buildNotificationLink(
        makeNotification({ type: 'follow', targetType: null, targetId: null, metadata: {} }),
        {}
      )
    ).toBe('/u/alice');
  });
});

describe('buildNotificationLink — topic posts (openings / squares)', () => {
  it('links a new_post to the opening post page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'new_post',
          metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
        }),
        {}
      )
    ).toBe('/topics/openings/sicilian-defense/posts/post-1');
  });

  it('links a new_post to the square post page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'new_post',
          metadata: { topicType: 'square', topicKey: 'e4', postId: 'post-42' },
        }),
        {}
      )
    ).toBe('/topics/squares/e4/posts/post-42');
  });

  it('links a like on a topic post to its post page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'topic_post',
          targetId: 'post-99',
          metadata: { topicType: 'square', topicKey: 'd5', postId: 'post-99' },
        }),
        {}
      )
    ).toBe('/topics/squares/d5/posts/post-99');
  });

  it('links a reply to the base post page when there is no replyId', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'reply',
          metadata: { topicType: 'opening', topicKey: 'sicilian-defense', postId: 'post-1' },
        }),
        {}
      )
    ).toBe('/topics/openings/sicilian-defense/posts/post-1');
  });

  it('anchors a reply to #post-{replyId} when present', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'reply',
          metadata: {
            topicType: 'square',
            topicKey: 'e4',
            postId: 'post-42',
            replyId: 'reply-7',
          },
        }),
        {}
      )
    ).toBe('/topics/squares/e4/posts/post-42#post-reply-7');
  });

  it('returns null for a reply with no usable metadata', () => {
    expect(buildNotificationLink(makeNotification({ type: 'reply', metadata: {} }), {})).toBeNull();
  });
});

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

  it('points a thread-derived new_comment_on_topic at the comment anchor (replyId wins)', () => {
    // Direct comments on /topics posts are stored as replies but notify as
    // new_comment_on_topic; the link must land on the concrete comment.
    const link = buildNotificationLink(
      makeNotification({
        type: 'new_comment_on_topic',
        metadata: {
          topicType: 'opening',
          topicKey: 'sicilian-defense',
          postId: 'post-1',
          replyId: 'reply-9',
        },
      }),
      {}
    );
    expect(link).toBe('/topics/openings/sicilian-defense/posts/post-1#post-reply-9');
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

describe('buildNotificationLink — games', () => {
  it('links a game like to the shared game page', () => {
    expect(
      buildNotificationLink(
        makeNotification({ type: 'like', targetType: 'game', targetId: 'game-77', metadata: {} }),
        {}
      )
    ).toBe('/games/shared/game-77');
  });

  it('deep-links a game_comment like to the liked comment', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'game_comment',
          targetId: 'comment-7',
          metadata: { gameId: 'game-42' },
        }),
        {}
      )
    ).toBe('/games/shared/game-42?comment=comment-7');
  });

  it('deep-links a new_comment_on_topic on a game to the new comment', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'new_comment_on_topic',
          targetType: 'game_comment',
          targetId: 'comment-7',
          metadata: { gameId: 'game-42' },
        }),
        {}
      )
    ).toBe('/games/shared/game-42?comment=comment-7');
  });

  it('deep-links a reply on a game comment to the reply itself', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'reply',
          targetType: 'game_comment',
          targetId: 'reply-8',
          metadata: { gameId: 'game-42' },
        }),
        {}
      )
    ).toBe('/games/shared/game-42?comment=reply-8');
  });

  it('links a new_game to the shared game page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'new_game',
          targetType: 'game',
          targetId: 'game-9',
          metadata: {},
        }),
        {}
      )
    ).toBe('/games/shared/game-9');
  });
});

describe('buildNotificationLink — positions', () => {
  it('routes a memory position like to the position-memory page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'position',
          targetId: 'pos-abc',
          metadata: { positionId: 'pos-abc', positionType: 'memory' },
        }),
        {}
      )
    ).toBe('/practice/position-memory/pos-abc');
  });

  it('routes a puzzle position like to the puzzle page (memory URL 404s for puzzles)', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'position',
          targetId: 'pos-puz',
          metadata: { positionId: 'pos-puz', positionType: 'puzzle' },
        }),
        {}
      )
    ).toBe('/practice/puzzle/pos-puz');
  });

  it('returns null for a sequence position like (no detail page → degrade to button)', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'position',
          targetId: 'pos-seq',
          metadata: { positionId: 'pos-seq', positionType: 'sequence' },
        }),
        {}
      )
    ).toBeNull();
  });

  it('falls back to the memory page for a legacy like missing positionType', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'position',
          targetId: 'pos-legacy',
          metadata: { positionId: 'pos-legacy' },
        }),
        {}
      )
    ).toBe('/practice/position-memory/pos-legacy');
  });

  it('falls back to the memory page for an unknown positionType string', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'position',
          targetId: 'pos-unknown',
          metadata: { positionId: 'pos-unknown', positionType: 'bogus-type' },
        }),
        {}
      )
    ).toBe('/practice/position-memory/pos-unknown');
  });

  it('falls back to targetId for a position like with no metadata', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'position',
          targetId: 'pos-xyz',
          metadata: {},
        }),
        {}
      )
    ).toBe('/practice/position-memory/pos-xyz');
  });

  it('returns null for a position like with neither metadata nor targetId', () => {
    expect(
      buildNotificationLink(
        makeNotification({ type: 'like', targetType: 'position', targetId: null, metadata: {} }),
        {}
      )
    ).toBeNull();
  });

  it('routes new_position by positionType, mirroring the like path', () => {
    const mk = (targetId: string, metadata: NotificationWithActor['metadata']) =>
      buildNotificationLink(
        makeNotification({ type: 'new_position', targetType: 'position', targetId, metadata }),
        {}
      );
    expect(mk('p-mem', { positionId: 'p-mem', positionType: 'memory' })).toBe(
      '/practice/position-memory/p-mem'
    );
    expect(mk('p-puz', { positionId: 'p-puz', positionType: 'puzzle' })).toBe(
      '/practice/puzzle/p-puz'
    );
    expect(mk('p-seq', { positionId: 'p-seq', positionType: 'sequence' })).toBeNull();
    expect(mk('p-legacy', { positionId: 'p-legacy' })).toBe('/practice/position-memory/p-legacy');
    expect(mk('p-nometa', {})).toBe('/practice/position-memory/p-nometa');
  });

  it('routes puzzle_forked straight to the new puzzle, regardless of the fork source type', () => {
    const mk = (sourceType: string) =>
      buildNotificationLink(
        makeNotification({
          type: 'puzzle_forked',
          targetType: 'position',
          targetId: 'new-puzzle-1',
          metadata: { positionId: 'new-puzzle-1', positionType: 'puzzle', sourceType },
        }),
        {}
      );
    expect(mk('puzzle')).toBe('/practice/puzzle/new-puzzle-1');
    expect(mk('memory')).toBe('/practice/puzzle/new-puzzle-1');
  });

  it('routes memory_forked to the new position-memory entry', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'memory_forked',
          targetType: 'position',
          targetId: 'new-memory-1',
          metadata: { positionId: 'new-memory-1', positionType: 'memory', sourceType: 'memory' },
        }),
        {}
      )
    ).toBe('/practice/position-memory/new-memory-1');
  });
});

describe('buildNotificationLink — position edit requests', () => {
  it('routes a submitted notification to the position suggestions page (memory)', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'position_edit_request_submitted',
          targetType: 'position_edit_request',
          targetId: 'req-1',
          metadata: { positionId: 'pos-mem', positionType: 'memory' },
        }),
        {}
      )
    ).toBe('/practice/position-memory/pos-mem/suggestions');
  });

  it('routes a submitted notification to the puzzle suggestions page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'position_edit_request_submitted',
          targetType: 'position_edit_request',
          targetId: 'req-2',
          metadata: { positionId: 'pos-puz', positionType: 'puzzle' },
        }),
        {}
      )
    ).toBe('/practice/puzzle/pos-puz/suggestions');
  });

  it('falls back to the memory suggestions page for a submitted notification missing positionType', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'position_edit_request_submitted',
          targetType: 'position_edit_request',
          targetId: 'req-3',
          metadata: { positionId: 'pos-legacy' },
        }),
        {}
      )
    ).toBe('/practice/position-memory/pos-legacy/suggestions');
  });

  it('returns null for a submitted notification with no metadata', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'position_edit_request_submitted',
          targetType: 'position_edit_request',
          targetId: 'req',
          metadata: {},
        }),
        {}
      )
    ).toBeNull();
  });

  it('routes an accepted notification to the position detail page (not suggestions)', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'position_edit_request_accepted',
          targetType: 'position_edit_request',
          targetId: 'req-4',
          metadata: { positionId: 'pos-mem', positionType: 'memory' },
        }),
        {}
      )
    ).toBe('/practice/position-memory/pos-mem');
  });
});

describe('buildNotificationLink — chunk lifecycle & edit requests', () => {
  it('links chunk edit-request notifications (submitted / accepted) to the edit-requests page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'chunk_edit_request_submitted',
          targetType: 'chunk_edit_request',
          targetId: 'req-1',
          metadata: { chunkId: 'c1', slug: 'fianchetto' },
        }),
        {}
      )
    ).toBe('/chunks/fianchetto/edit-requests');
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'chunk_edit_request_accepted',
          targetType: 'chunk_edit_request',
          targetId: 'req-2',
          metadata: { chunkId: 'c2', slug: 'rook-battery' },
        }),
        {}
      )
    ).toBe('/chunks/rook-battery/edit-requests');
  });

  it('returns null for a chunk edit-request with no metadata', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'chunk_edit_request_submitted',
          targetType: 'chunk_edit_request',
          targetId: 'req',
          metadata: {},
        }),
        {}
      )
    ).toBeNull();
  });

  it('links a new_chunk_draft to edit-requests and a chunk_published to the chunk page', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'new_chunk_draft',
          targetType: 'chunk',
          targetId: 'c-d',
          metadata: { chunkId: 'c-d', slug: 'rook-battery', kind: 'created' },
        }),
        {}
      )
    ).toBe('/chunks/rook-battery/edit-requests');
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'chunk_published',
          targetType: 'chunk',
          targetId: 'c-p',
          metadata: { chunkId: 'c-p', slug: 'fianchetto', kind: 'published' },
        }),
        {}
      )
    ).toBe('/chunks/fianchetto');
  });

  it('returns null for chunk lifecycle notifications with no metadata', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'new_chunk_draft',
          targetType: 'chunk',
          targetId: 'c',
          metadata: {},
        }),
        {}
      )
    ).toBeNull();
  });
});

describe('buildNotificationLink — achievements & non-link cases', () => {
  it('links an achievement to the viewer’s achievements page only when the username is known', () => {
    const notif = makeNotification({
      type: 'achievement_granted',
      actor: null,
      targetType: null,
      targetId: null,
      metadata: { badges: [], year: 2026, month: 3 },
    });
    expect(buildNotificationLink(notif, { currentUsername: 'testuser' })).toBe(
      '/u/testuser/achievements'
    );
    expect(buildNotificationLink(notif, {})).toBeNull();
  });

  it('links a rank_grant to the granted rank detail page', () => {
    const notif = makeNotification({
      type: 'rank_grant',
      actor: null,
      targetType: 'user_rank',
      targetId: 'user-rank-1',
      metadata: { rankSlug: '1dan', rankLevel: 110, reason: 'Met the requirement pre-launch' },
    });
    expect(buildNotificationLink(notif, {})).toBe('/dojo/ranks/1dan');
  });

  it('returns null for a like with an unknown target and non-post metadata', () => {
    expect(
      buildNotificationLink(
        makeNotification({
          type: 'like',
          targetType: 'unknown_target' as NotificationWithActor['targetType'],
          targetId: 'some-id',
          metadata: { foo: 'bar' },
        }),
        {}
      )
    ).toBeNull();
  });
});
