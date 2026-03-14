import { describe, expect, it } from 'vitest';

/**
 * Tests for the isLikeMetadata type guard logic.
 *
 * The actual function is defined locally in NotificationItem.tsx and is not exported.
 * We replicate its logic here to verify edge case behavior.
 */
type LikeMetadata = { topicType: string; topicKey: string; postId: string };

function isLikeMetadata(m: unknown): m is LikeMetadata {
  return (
    typeof m === 'object' && m !== null && 'topicType' in m && 'topicKey' in m && 'postId' in m
  );
}

describe('isLikeMetadata', () => {
  it('should return true for valid metadata', () => {
    expect(isLikeMetadata({ topicType: 'opening', topicKey: 'sicilian', postId: 'p1' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isLikeMetadata(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isLikeMetadata(undefined)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isLikeMetadata({})).toBe(false);
  });

  it('should return false when topicType is missing', () => {
    expect(isLikeMetadata({ topicKey: 'k', postId: 'p' })).toBe(false);
  });

  it('should return false when topicKey is missing', () => {
    expect(isLikeMetadata({ topicType: 't', postId: 'p' })).toBe(false);
  });

  it('should return false when postId is missing', () => {
    expect(isLikeMetadata({ topicType: 't', topicKey: 'k' })).toBe(false);
  });

  it('should return true for metadata with extra properties', () => {
    expect(isLikeMetadata({ topicType: 't', topicKey: 'k', postId: 'p', extra: true })).toBe(true);
  });

  it('should return false for non-object values', () => {
    expect(isLikeMetadata('string')).toBe(false);
    expect(isLikeMetadata(42)).toBe(false);
    expect(isLikeMetadata(true)).toBe(false);
    expect(isLikeMetadata([])).toBe(false);
  });
});
