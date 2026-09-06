import { describe, expect, it } from 'vitest';

import { makePost as makeBasePost } from './__test-support__/post-fixture';
import type { PostWithReplyMeta } from './shared';
import { sortPosts } from './shared';

/**
 * The three fields these cases order by, flattened out of the nested meta
 * objects they live in — every case below sets one or two of them and nothing
 * else, so `likeCount: 5` reads better here than the `likeMeta` literal the
 * row actually carries.
 */
function makePost(
  overrides: Partial<{
    id: string;
    createdAt: Date;
    likeCount: number;
    latestReplyAt: Date | null;
  }> = {}
): PostWithReplyMeta {
  const base = makeBasePost({ id: overrides.id, createdAt: overrides.createdAt });
  return {
    ...base,
    replyMeta: { ...base.replyMeta, latestReplyAt: overrides.latestReplyAt ?? null },
    likeMeta: { ...base.likeMeta, likeCount: overrides.likeCount ?? 0 },
  };
}

describe('sortPosts', () => {
  describe('new mode', () => {
    it('should return posts unchanged (no-op)', () => {
      const posts = [
        makePost({ id: 'a', createdAt: new Date('2025-01-03') }),
        makePost({ id: 'b', createdAt: new Date('2025-01-01') }),
        makePost({ id: 'c', createdAt: new Date('2025-01-02') }),
      ];
      const result = sortPosts(posts, 'new');
      expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    });

    it('should return a copy, never the input reference (pure contract)', () => {
      const posts = [makePost()];
      const result = sortPosts(posts, 'new');
      expect(result).toEqual(posts);
      expect(result).not.toBe(posts);
    });
  });

  describe('popular mode', () => {
    it('should sort by likeCount descending', () => {
      const posts = [
        makePost({ id: 'low', likeCount: 1 }),
        makePost({ id: 'high', likeCount: 10 }),
        makePost({ id: 'mid', likeCount: 5 }),
      ];
      const result = sortPosts(posts, 'popular');
      expect(result.map((p) => p.id)).toEqual(['high', 'mid', 'low']);
    });

    it('should use createdAt as tiebreaker when likeCount is equal', () => {
      const posts = [
        makePost({ id: 'older', likeCount: 5, createdAt: new Date('2025-01-01') }),
        makePost({ id: 'newer', likeCount: 5, createdAt: new Date('2025-01-03') }),
        makePost({ id: 'middle', likeCount: 5, createdAt: new Date('2025-01-02') }),
      ];
      const result = sortPosts(posts, 'popular');
      expect(result.map((p) => p.id)).toEqual(['newer', 'middle', 'older']);
    });
  });

  describe('active mode', () => {
    it('should sort by latestReplyAt descending', () => {
      const posts = [
        makePost({ id: 'old-reply', latestReplyAt: new Date('2025-01-01') }),
        makePost({ id: 'new-reply', latestReplyAt: new Date('2025-01-03') }),
        makePost({ id: 'mid-reply', latestReplyAt: new Date('2025-01-02') }),
      ];
      const result = sortPosts(posts, 'active');
      expect(result.map((p) => p.id)).toEqual(['new-reply', 'mid-reply', 'old-reply']);
    });

    it('should treat null latestReplyAt as 0 (oldest)', () => {
      const posts = [
        makePost({ id: 'no-reply', latestReplyAt: null }),
        makePost({ id: 'has-reply', latestReplyAt: new Date('2025-01-01') }),
      ];
      const result = sortPosts(posts, 'active');
      expect(result.map((p) => p.id)).toEqual(['has-reply', 'no-reply']);
    });

    it('should use createdAt as tiebreaker when latestReplyAt is equal', () => {
      const sameReplyAt = new Date('2025-01-15');
      const posts = [
        makePost({ id: 'older', latestReplyAt: sameReplyAt, createdAt: new Date('2025-01-01') }),
        makePost({ id: 'newer', latestReplyAt: sameReplyAt, createdAt: new Date('2025-01-03') }),
      ];
      const result = sortPosts(posts, 'active');
      expect(result.map((p) => p.id)).toEqual(['newer', 'older']);
    });

    it('should use createdAt as tiebreaker when both have null latestReplyAt', () => {
      const posts = [
        makePost({ id: 'older', latestReplyAt: null, createdAt: new Date('2025-01-01') }),
        makePost({ id: 'newer', latestReplyAt: null, createdAt: new Date('2025-01-03') }),
      ];
      const result = sortPosts(posts, 'active');
      expect(result.map((p) => p.id)).toEqual(['newer', 'older']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      expect(sortPosts([], 'new')).toEqual([]);
      expect(sortPosts([], 'popular')).toEqual([]);
      expect(sortPosts([], 'active')).toEqual([]);
    });

    it('should handle single element array', () => {
      const posts = [makePost({ id: 'only' })];
      expect(sortPosts(posts, 'popular').map((p) => p.id)).toEqual(['only']);
      expect(sortPosts(posts, 'active').map((p) => p.id)).toEqual(['only']);
    });
  });
});
