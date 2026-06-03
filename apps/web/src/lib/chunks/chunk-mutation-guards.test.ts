import { describe, expect, it } from 'vitest';

import { guardChunkOwnership } from './chunk-mutation-guards';

describe('guardChunkOwnership', () => {
  const owner = 'user-1';

  it('returns null when the caller owns a live chunk', () => {
    expect(guardChunkOwnership({ userId: owner, deletedAt: null }, owner)).toBeNull();
  });

  it('rejects a non-owner as unauthorized', () => {
    expect(guardChunkOwnership({ userId: 'someone-else', deletedAt: null }, owner)).toEqual({
      error: 'unauthorized',
    });
  });

  it('rejects a soft-deleted chunk as alreadyDeleted', () => {
    expect(guardChunkOwnership({ userId: owner, deletedAt: new Date() }, owner)).toEqual({
      error: 'alreadyDeleted',
    });
  });

  it('checks ownership before delete state', () => {
    // A non-owner acting on a deleted chunk still reports unauthorized first.
    expect(guardChunkOwnership({ userId: 'someone-else', deletedAt: new Date() }, owner)).toEqual({
      error: 'unauthorized',
    });
  });
});
