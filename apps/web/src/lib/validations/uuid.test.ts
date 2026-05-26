import { describe, expect, it } from 'vitest';

import { UUID_RE, isValidUUID, validateUUID } from './uuid';

const VALID = '11111111-2222-3333-4444-555555555555';

describe('UUID_RE', () => {
  it('matches a canonical UUID', () => {
    expect(UUID_RE.test(VALID)).toBe(true);
  });

  it('rejects empty strings, junk, and malformed UUIDs', () => {
    expect(UUID_RE.test('')).toBe(false);
    expect(UUID_RE.test('not-a-uuid')).toBe(false);
    expect(UUID_RE.test('1111-2222-3333-4444')).toBe(false);
  });
});

describe('isValidUUID', () => {
  it('returns true for a canonical UUID', () => {
    expect(isValidUUID(VALID)).toBe(true);
  });

  it('returns false for malformed input', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });
});

describe('validateUUID', () => {
  it('returns null when the value is a UUID', () => {
    expect(validateUUID(VALID, 'postId')).toBeNull();
  });

  it('builds an `invalid<Field>` error key by capitalising the field name', () => {
    expect(validateUUID('garbage', 'postId')).toEqual({ error: 'invalidPostId' });
    expect(validateUUID('garbage', 'chunkId')).toEqual({ error: 'invalidChunkId' });
    expect(validateUUID('garbage', 'positionId')).toEqual({ error: 'invalidPositionId' });
  });
});
