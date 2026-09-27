import { describe, expect, it, vi } from 'vitest';

import { type ReplyResolutionPost, decideReplyTarget, rootPostIdOf } from './reply-resolution';

vi.mock('@/lib/db', () => ({ db: {}, topicPosts: {} }));

function post(overrides: Partial<ReplyResolutionPost>): ReplyResolutionPost {
  return {
    id: 'post',
    userId: 'post-author',
    rootPostId: null,
    replyPermission: 'everyone',
    ...overrides,
  };
}

describe('decideReplyTarget', () => {
  it('attaches a direct reply to the top-level post and notifies its author', () => {
    const top = post({ id: 'post' });
    expect(decideReplyTarget('post', 'post', top, top)).toEqual({
      parentId: 'post',
      rootPostId: 'post',
      permissionPost: { userId: 'post-author', replyPermission: 'everyone' },
      notifyUserId: 'post-author',
    });
  });

  it('attaches a reply-to-reply under the target, governed by the root post', () => {
    const target = post({ id: 'reply', userId: 'reply-author', rootPostId: 'post' });
    const root = post({ id: 'post', replyPermission: 'followers' });
    expect(decideReplyTarget('reply', 'post', target, root)).toEqual({
      parentId: 'reply',
      rootPostId: 'post',
      permissionPost: { userId: 'post-author', replyPermission: 'followers' },
      notifyUserId: 'reply-author',
    });
  });

  it('keeps a null author as the notify target (anonymised account)', () => {
    const target = post({ id: 'reply', userId: null, rootPostId: 'post' });
    const result = decideReplyTarget('reply', 'post', target, post({}));
    expect(result).toMatchObject({ notifyUserId: null });
  });

  it.each([
    ['target', undefined, post({})],
    ['root', post({ id: 'reply', rootPostId: 'post' }), undefined],
  ])('reports postNotFound when the %s is missing', (_, target, root) => {
    expect(decideReplyTarget('reply', 'post', target, root)).toEqual({ error: 'postNotFound' });
  });
});

describe('rootPostIdOf', () => {
  it('uses the target’s root, falling back to the URL post when it has none', () => {
    expect(rootPostIdOf(post({ rootPostId: 'root' }), 'post')).toBe('root');
    expect(rootPostIdOf(post({ rootPostId: null }), 'post')).toBe('post');
  });
});
