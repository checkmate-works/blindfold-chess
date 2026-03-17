import { describe, expect, it } from 'vitest';

/**
 * Tests for the isPostMetadata type guard logic.
 *
 * The actual function is defined locally in NotificationItem.tsx and is not exported.
 * We replicate its logic here to verify edge case behavior after the rename from
 * isLikeMetadata to isPostMetadata (now shared by both 'like' and 'new_post' types).
 */
type PostMetadata = { topicType: string; topicKey: string; postId: string };

function isPostMetadata(m: unknown): m is PostMetadata {
  return (
    typeof m === 'object' && m !== null && 'topicType' in m && 'topicKey' in m && 'postId' in m
  );
}

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
