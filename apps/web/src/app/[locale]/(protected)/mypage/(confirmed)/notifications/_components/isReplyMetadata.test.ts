import { describe, expect, it } from 'vitest';

/**
 * Tests for the isReplyMetadata type guard logic.
 *
 * The actual function is defined locally in NotificationItem.tsx and is not exported.
 * We replicate its logic here to verify edge case behavior.
 * isReplyMetadata extends isPostMetadata by additionally requiring a `replyId` string field.
 */
type PostMetadata = { topicType: string; topicKey: string; postId: string };
type ReplyMetadata = PostMetadata & { replyId: string };

function isPostMetadata(m: unknown): m is PostMetadata {
  return (
    typeof m === 'object' && m !== null && 'topicType' in m && 'topicKey' in m && 'postId' in m
  );
}

function isReplyMetadata(m: unknown): m is ReplyMetadata {
  return (
    isPostMetadata(m) &&
    'replyId' in m &&
    typeof (m as Record<string, unknown>).replyId === 'string'
  );
}

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
