import { describe, expect, it } from 'vitest';

import {
  getPositionTypeFromMetadata,
  isAnnouncementMetadata,
  isChunkEditRequestMetadata,
  isPositionForkedMetadata,
  isPositionMetadata,
  isPostMetadata,
  isReplyMetadata,
} from './type-guards';

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

// ---------------------------------------------------------------------------
// isPositionMetadata
// ---------------------------------------------------------------------------

describe('isPositionMetadata', () => {
  it('should return true for valid metadata with positionId', () => {
    expect(isPositionMetadata({ positionId: 'pos-1' })).toBe(true);
  });

  it('should return true for metadata with extra properties', () => {
    expect(isPositionMetadata({ positionId: 'pos-1', extra: 'x' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPositionMetadata(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isPositionMetadata(undefined)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isPositionMetadata({})).toBe(false);
  });

  it('should return false when positionId is not a string', () => {
    expect(isPositionMetadata({ positionId: 123 })).toBe(false);
  });

  it('should return false when positionId is null', () => {
    expect(isPositionMetadata({ positionId: null })).toBe(false);
  });

  it('should return false when positionId is a boolean', () => {
    expect(isPositionMetadata({ positionId: true })).toBe(false);
  });

  it('should return false when positionId is an object', () => {
    expect(isPositionMetadata({ positionId: { nested: 'value' } })).toBe(false);
  });

  it('should return true when positionId is an empty string (current guard permits it)', () => {
    // NOTE: The current type guard only checks typeof === 'string', so '' passes.
    // This documents the existing behavior; callers must guard against empty strings themselves.
    expect(isPositionMetadata({ positionId: '' })).toBe(true);
  });

  it('should return false for non-object values', () => {
    expect(isPositionMetadata('string')).toBe(false);
    expect(isPositionMetadata(42)).toBe(false);
    expect(isPositionMetadata(true)).toBe(false);
  });

  it('should return false for an array', () => {
    expect(isPositionMetadata([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPositionTypeFromMetadata
// ---------------------------------------------------------------------------

describe('getPositionTypeFromMetadata', () => {
  it('returns "memory" for metadata.positionType = "memory"', () => {
    expect(getPositionTypeFromMetadata({ positionId: 'x', positionType: 'memory' })).toBe('memory');
  });

  it('returns "puzzle" for metadata.positionType = "puzzle"', () => {
    // Regression: the 404 bug stemmed from `positionType` being absent in
    // `like` notifications, so puzzle likes defaulted to the memory URL.
    // This test pins the mapping used by the notification link resolver.
    expect(getPositionTypeFromMetadata({ positionId: 'x', positionType: 'puzzle' })).toBe('puzzle');
  });

  it('returns "sequence" for metadata.positionType = "sequence"', () => {
    expect(getPositionTypeFromMetadata({ positionId: 'x', positionType: 'sequence' })).toBe(
      'sequence'
    );
  });

  it('returns null when positionType is absent (legacy metadata)', () => {
    expect(getPositionTypeFromMetadata({ positionId: 'x' })).toBeNull();
  });

  it('returns null when positionType is an unknown string', () => {
    // The metadata column is JSONB and historically untyped, so we defend
    // against stale/unexpected values instead of crashing the UI.
    expect(
      getPositionTypeFromMetadata({
        positionId: 'x',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        positionType: 'unknown-type' as any,
      })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isChunkEditRequestMetadata
// ---------------------------------------------------------------------------

describe('isChunkEditRequestMetadata', () => {
  it('returns true when both chunkId and slug are strings', () => {
    expect(isChunkEditRequestMetadata({ chunkId: 'c-1', slug: 'fianchetto' })).toBe(true);
  });

  it('returns false when chunkId is missing', () => {
    expect(isChunkEditRequestMetadata({ slug: 'fianchetto' })).toBe(false);
  });

  it('returns false when slug is missing', () => {
    expect(isChunkEditRequestMetadata({ chunkId: 'c-1' })).toBe(false);
  });

  it('returns false for null / undefined / primitives', () => {
    expect(isChunkEditRequestMetadata(null)).toBe(false);
    expect(isChunkEditRequestMetadata(undefined)).toBe(false);
    expect(isChunkEditRequestMetadata('foo')).toBe(false);
    expect(isChunkEditRequestMetadata(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPositionForkedMetadata
// ---------------------------------------------------------------------------

describe('isPositionForkedMetadata', () => {
  it('returns true with positionId, positionType, and sourceType all present', () => {
    expect(
      isPositionForkedMetadata({ positionId: 'p-1', positionType: 'puzzle', sourceType: 'memory' })
    ).toBe(true);
  });

  it('returns true for a same-type memory fork (positionType and sourceType both "memory")', () => {
    expect(
      isPositionForkedMetadata({ positionId: 'p-1', positionType: 'memory', sourceType: 'memory' })
    ).toBe(true);
  });

  it('returns false when sourceType is missing (falls back to plain PositionMetadata)', () => {
    expect(isPositionForkedMetadata({ positionId: 'p-1', positionType: 'puzzle' })).toBe(false);
  });

  it('returns false when positionId is missing', () => {
    expect(isPositionForkedMetadata({ sourceType: 'puzzle' })).toBe(false);
  });

  it('returns false for null / undefined / primitives', () => {
    expect(isPositionForkedMetadata(null)).toBe(false);
    expect(isPositionForkedMetadata(undefined)).toBe(false);
    expect(isPositionForkedMetadata('foo')).toBe(false);
  });
});
