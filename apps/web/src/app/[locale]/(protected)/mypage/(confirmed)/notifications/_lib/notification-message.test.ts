import type { TranslatorWithHas } from '@/i18n/translator';
import { describe, expect, it } from 'vitest';

import { buildNotificationMessage } from './notification-message';
import type { NotificationWithActor } from './queries';

/**
 * A translator that echoes the key and values, so an assertion names the
 * message key the switch picked rather than any locale's copy.
 */
const t = Object.assign(
  (key: string, values?: Record<string, string | number | Date>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  { has: () => false }
) as TranslatorWithHas;

const tRoot = (key: string) => key;

function makeNotification(overrides: Partial<NotificationWithActor>): NotificationWithActor {
  return {
    id: 'n1',
    type: 'like',
    targetType: 'topic_post',
    targetId: 't1',
    groupKey: null,
    metadata: {},
    isRead: false,
    createdAt: new Date('2026-10-24T00:00:00Z'),
    actor: { username: 'alice', displayName: 'Alice', avatarUrl: null },
    ...overrides,
  };
}

function message(overrides: Partial<NotificationWithActor>) {
  return buildNotificationMessage(makeNotification(overrides), { actorName: 'Alice', t, tRoot });
}

describe('buildNotificationMessage — like', () => {
  it('reads "liked your arrival announcement" for a like on a member_joined card', () => {
    expect(message({ type: 'like', targetType: 'member_joined', targetId: 'feed-1' })).toBe(
      'likeJoinAnnouncementMessage:{"actor":"Alice"}'
    );
  });

  it('still reads "liked your game" for a shared game', () => {
    expect(message({ type: 'like', targetType: 'game', targetId: 'g1' })).toBe(
      'likeGameMessage:{"actor":"Alice"}'
    );
  });

  it('reads "liked your comment" for topic posts and game comments', () => {
    expect(message({ type: 'like', targetType: 'topic_post' })).toBe(
      'likeCommentMessage:{"actor":"Alice"}'
    );
    expect(message({ type: 'like', targetType: 'game_comment' })).toBe(
      'likeCommentMessage:{"actor":"Alice"}'
    );
  });

  it('falls back to the generic like message for other targets', () => {
    expect(message({ type: 'like', targetType: 'position' })).toBe('likeMessage:{"actor":"Alice"}');
  });
});
