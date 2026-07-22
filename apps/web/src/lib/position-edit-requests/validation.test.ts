import { describe, expect, it } from 'vitest';

import { EDIT_REQUEST_COMMENT_MAX_LENGTH } from '@/lib/edit-requests/shared';

import { validateSubmitPositionEditRequest } from './validation';

// Valid v4 UUIDs for fixtures.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const T2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** Payload/current builders so each test states only what it exercises. */
const payload = (over: Partial<Parameters<typeof validateSubmitPositionEditRequest>[0]> = {}) => ({
  proposedThemeIds: [],
  proposedChunkIds: [],
  ...over,
});
const current = (over: Partial<Parameters<typeof validateSubmitPositionEditRequest>[1]> = {}) => ({
  currentThemeIds: [],
  currentChunkIds: [],
  ...over,
});

describe('validateSubmitPositionEditRequest', () => {
  it('rejects a malformed (non-UUID) chunk id', () => {
    const result = validateSubmitPositionEditRequest(
      payload({ proposedChunkIds: ['not-a-uuid'] }),
      current()
    );
    expect(result).toBe('invalidTagId');
  });

  it('rejects a malformed (non-UUID) theme id', () => {
    const result = validateSubmitPositionEditRequest(
      payload({ proposedThemeIds: ['not-a-uuid'] }),
      current()
    );
    expect(result).toBe('invalidTagId');
  });

  it('rejects a proposal whose tags are all already linked (order-independent)', () => {
    const result = validateSubmitPositionEditRequest(
      payload({ proposedThemeIds: [T2, T1], proposedChunkIds: [B, A] }),
      current({ currentThemeIds: [T1, T2], currentChunkIds: [A, B] })
    );
    expect(result).toBe('nothingToAdd');
  });

  it('rejects a fully empty proposal', () => {
    expect(validateSubmitPositionEditRequest(payload(), current())).toBe('nothingToAdd');
    expect(validateSubmitPositionEditRequest(payload(), current({ currentChunkIds: [A] }))).toBe(
      'nothingToAdd'
    );
  });

  it('treats duplicate ids as one when deciding whether anything is added', () => {
    const result = validateSubmitPositionEditRequest(
      payload({ proposedChunkIds: [A, A] }),
      current({ currentChunkIds: [A] })
    );
    expect(result).toBe('nothingToAdd');
  });

  it('accepts a chunk-only proposal and dedupes the output', () => {
    const result = validateSubmitPositionEditRequest(
      payload({ proposedChunkIds: [A, B, B, C], comment: '  add a battery  ' }),
      current({ currentChunkIds: [A] })
    );
    expect(result).toEqual({
      proposedThemeIds: [],
      proposedChunkIds: [A, B, C],
      comment: 'add a battery',
    });
  });

  it('accepts a theme-only proposal', () => {
    const result = validateSubmitPositionEditRequest(
      payload({ proposedThemeIds: [T1] }),
      current({ currentThemeIds: [T2] })
    );
    expect(result).toEqual({ proposedThemeIds: [T1], proposedChunkIds: [], comment: null });
  });

  it('accepts a mixed proposal when only one kind adds something new', () => {
    // Chunks are all already linked; the new theme alone carries the proposal.
    const result = validateSubmitPositionEditRequest(
      payload({ proposedThemeIds: [T1], proposedChunkIds: [A] }),
      current({ currentChunkIds: [A] })
    );
    expect(result).toEqual({ proposedThemeIds: [T1], proposedChunkIds: [A], comment: null });
  });

  it('normalizes a whitespace-only comment to null', () => {
    const result = validateSubmitPositionEditRequest(
      payload({ proposedChunkIds: [B], comment: '   ' }),
      current({ currentChunkIds: [A] })
    );
    expect(result).toEqual({ proposedThemeIds: [], proposedChunkIds: [B], comment: null });
  });

  it('rejects an over-length comment even when the proposal adds something', () => {
    const result = validateSubmitPositionEditRequest(
      payload({
        proposedChunkIds: [B],
        comment: 'x'.repeat(EDIT_REQUEST_COMMENT_MAX_LENGTH + 1),
      }),
      current({ currentChunkIds: [A] })
    );
    expect(result).toBe('commentTooLong');
  });
});
