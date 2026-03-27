import { describe, expect, it } from 'vitest';

import { isAnnouncementMetadata, isPostMetadata, isReplyMetadata } from './type-guards';

// ---------------------------------------------------------------------------
// isPostMetadata
// ---------------------------------------------------------------------------

describe('isPostMetadata', () => {
  it('should return true for valid metadata', () => {
    expect(isPostMetadata({ topicType: 'opening', topicKey: 'sicilian', postId: 'p1' })).toBe(true);
  });

  it('should return true for square topic metadata', () => {
    expect(isPostMetadata({ topicType: 'square', topicKey: 'e4', postId: 'p2' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPostMetadata(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isPostMetadata(undefined)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isPostMetadata({})).toBe(false);
  });

  it('should return false when topicType is missing', () => {
    expect(isPostMetadata({ topicKey: 'k', postId: 'p' })).toBe(false);
  });

  it('should return false when topicKey is missing', () => {
    expect(isPostMetadata({ topicType: 't', postId: 'p' })).toBe(false);
  });

  it('should return false when postId is missing', () => {
    expect(isPostMetadata({ topicType: 't', topicKey: 'k' })).toBe(false);
  });

  it('should return true for metadata with extra properties', () => {
    expect(isPostMetadata({ topicType: 't', topicKey: 'k', postId: 'p', extra: true })).toBe(true);
  });

  it('should return false for non-object values', () => {
    expect(isPostMetadata('string')).toBe(false);
    expect(isPostMetadata(42)).toBe(false);
    expect(isPostMetadata(true)).toBe(false);
    expect(isPostMetadata([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isReplyMetadata
// ---------------------------------------------------------------------------

describe('isReplyMetadata', () => {
  it('should return true for valid reply metadata with all required fields', () => {
    expect(
      isReplyMetadata({ topicType: 'opening', topicKey: 'sicilian', postId: 'p1', replyId: 'r1' })
    ).toBe(true);
  });

  it('should return true for square topic reply metadata', () => {
    expect(
      isReplyMetadata({ topicType: 'square', topicKey: 'e4', postId: 'p2', replyId: 'r2' })
    ).toBe(true);
  });

  it('should return false when replyId is missing (plain post metadata)', () => {
    expect(isReplyMetadata({ topicType: 'opening', topicKey: 'sicilian', postId: 'p1' })).toBe(
      false
    );
  });

  it('should return false for null', () => {
    expect(isReplyMetadata(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isReplyMetadata(undefined)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isReplyMetadata({})).toBe(false);
  });

  it('should return false when topicType is missing', () => {
    expect(isReplyMetadata({ topicKey: 'k', postId: 'p', replyId: 'r' })).toBe(false);
  });

  it('should return false when topicKey is missing', () => {
    expect(isReplyMetadata({ topicType: 't', postId: 'p', replyId: 'r' })).toBe(false);
  });

  it('should return false when postId is missing', () => {
    expect(isReplyMetadata({ topicType: 't', topicKey: 'k', replyId: 'r' })).toBe(false);
  });

  it('should return false when replyId is not a string', () => {
    expect(isReplyMetadata({ topicType: 't', topicKey: 'k', postId: 'p', replyId: 123 })).toBe(
      false
    );
  });

  it('should return true for metadata with extra properties', () => {
    expect(
      isReplyMetadata({ topicType: 't', topicKey: 'k', postId: 'p', replyId: 'r', extra: true })
    ).toBe(true);
  });

  it('should return false for non-object values', () => {
    expect(isReplyMetadata('string')).toBe(false);
    expect(isReplyMetadata(42)).toBe(false);
    expect(isReplyMetadata(true)).toBe(false);
    expect(isReplyMetadata([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAnnouncementMetadata
// ---------------------------------------------------------------------------

describe('isAnnouncementMetadata', () => {
  it('should return true for valid metadata with slug and title', () => {
    expect(isAnnouncementMetadata({ slug: 'my-post', title: 'My Post' })).toBe(true);
  });

  it('should return true for metadata with extra properties', () => {
    expect(isAnnouncementMetadata({ slug: 'x', title: 'y', extra: 123 })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isAnnouncementMetadata(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isAnnouncementMetadata(undefined)).toBe(false);
  });

  it('should return false for a string', () => {
    expect(isAnnouncementMetadata('hello')).toBe(false);
  });

  it('should return false for a number', () => {
    expect(isAnnouncementMetadata(42)).toBe(false);
  });

  it('should return false for a boolean', () => {
    expect(isAnnouncementMetadata(true)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isAnnouncementMetadata({})).toBe(false);
  });

  it('should return false when slug is missing', () => {
    expect(isAnnouncementMetadata({ title: 'My Post' })).toBe(false);
  });

  it('should return false when title is missing', () => {
    expect(isAnnouncementMetadata({ slug: 'my-post' })).toBe(false);
  });

  it('should return true when slug and title have empty string values', () => {
    // Empty strings pass typeof === 'string', so the type guard allows them
    expect(isAnnouncementMetadata({ slug: '', title: '' })).toBe(true);
  });

  it('should return false when slug and title have non-string values', () => {
    // The type guard checks value types via typeof === 'string'
    expect(isAnnouncementMetadata({ slug: 123, title: null })).toBe(false);
  });

  it('should return false for an array', () => {
    expect(isAnnouncementMetadata([])).toBe(false);
  });

  it('should return false for an array with slug and title indices', () => {
    // Arrays are objects but lack 'slug' and 'title' keys
    const arr = [1, 2];
    expect(isAnnouncementMetadata(arr)).toBe(false);
  });

  it('should return true for an array with slug and title properties', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any = [];
    arr.slug = 'x';
    arr.title = 'y';
    // Arrays with named properties pass the `in` check
    expect(isAnnouncementMetadata(arr)).toBe(true);
  });

  it('should return false for a function', () => {
    expect(isAnnouncementMetadata(() => {})).toBe(false);
  });

  it('should return true for a Date-like object with slug and title', () => {
    const d = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d as any).slug = 'x';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d as any).title = 'y';
    expect(isAnnouncementMetadata(d)).toBe(true);
  });
});
