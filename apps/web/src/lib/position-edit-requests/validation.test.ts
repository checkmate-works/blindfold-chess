import { describe, expect, it } from 'vitest';

import { EDIT_REQUEST_COMMENT_MAX_LENGTH } from '@/lib/edit-requests/shared';

import { validateSubmitPositionEditRequest } from './validation';

// Valid v4 UUIDs for fixtures.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

describe('validateSubmitPositionEditRequest', () => {
  it('rejects a malformed (non-UUID) chunk id', () => {
    const result = validateSubmitPositionEditRequest(
      { proposedChunkIds: ['not-a-uuid'] },
      { currentChunkIds: [] }
    );
    expect(result).toBe('invalidChunkId');
  });

  it('rejects a no-op proposal identical to the current set (order-independent)', () => {
    const result = validateSubmitPositionEditRequest(
      { proposedChunkIds: [B, A] },
      { currentChunkIds: [A, B] }
    );
    expect(result).toBe('identicalChunkSet');
  });

  it('treats duplicate ids as the same set (dedupe) when comparing to current', () => {
    const result = validateSubmitPositionEditRequest(
      { proposedChunkIds: [A, A, B] },
      { currentChunkIds: [A, B] }
    );
    expect(result).toBe('identicalChunkSet');
  });

  it('allows an empty proposed set (remove all links) when current is non-empty', () => {
    const result = validateSubmitPositionEditRequest(
      { proposedChunkIds: [] },
      { currentChunkIds: [A] }
    );
    expect(result).toEqual({ proposedChunkIds: [], comment: null });
  });

  it('rejects an empty proposed set when current is already empty (no-op)', () => {
    const result = validateSubmitPositionEditRequest(
      { proposedChunkIds: [] },
      { currentChunkIds: [] }
    );
    expect(result).toBe('identicalChunkSet');
  });

  it('accepts a changed set and dedupes the output', () => {
    const result = validateSubmitPositionEditRequest(
      { proposedChunkIds: [A, B, B, C], comment: '  add a battery  ' },
      { currentChunkIds: [A] }
    );
    expect(result).toEqual({ proposedChunkIds: [A, B, C], comment: 'add a battery' });
  });

  it('normalizes a whitespace-only comment to null', () => {
    const result = validateSubmitPositionEditRequest(
      { proposedChunkIds: [B], comment: '   ' },
      { currentChunkIds: [A] }
    );
    expect(result).toEqual({ proposedChunkIds: [B], comment: null });
  });

  it('rejects an over-length comment even when the set is valid', () => {
    const result = validateSubmitPositionEditRequest(
      {
        proposedChunkIds: [B],
        comment: 'x'.repeat(EDIT_REQUEST_COMMENT_MAX_LENGTH + 1),
      },
      { currentChunkIds: [A] }
    );
    expect(result).toBe('commentTooLong');
  });
});
