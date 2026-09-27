import { describe, expect, it } from 'vitest';

import { type ReplierRow, groupUniqueRepliers } from './unique-repliers';

function row(overrides: Partial<ReplierRow>): ReplierRow {
  return {
    rootPostId: 'p1',
    userId: 'u1',
    username: 'user1',
    displayName: null,
    avatarUrl: null,
    ...overrides,
  };
}

describe('groupUniqueRepliers', () => {
  it('keeps each replier once per post, in row order', () => {
    const result = groupUniqueRepliers([
      row({ userId: 'u2', username: 'bob', avatarUrl: 'b.png' }),
      row({ userId: 'u1', username: 'alice' }),
      row({ userId: 'u2', username: 'bob', avatarUrl: 'b.png' }),
    ]);
    expect(result.get('p1')).toEqual([
      { avatarUrl: 'b.png', displayName: 'bob' },
      { avatarUrl: null, displayName: 'alice' },
    ]);
  });

  it('dedups per post, not globally', () => {
    const result = groupUniqueRepliers([row({ rootPostId: 'p1' }), row({ rootPostId: 'p2' })]);
    expect(result.get('p1')).toHaveLength(1);
    expect(result.get('p2')).toHaveLength(1);
  });

  it('keeps every unique replier past the preview cap so the count and avatars agree', () => {
    const rows = ['a', 'b', 'c', 'd', 'e'].map((id) => row({ userId: id, username: id }));
    expect(groupUniqueRepliers(rows).get('p1')).toHaveLength(5);
  });

  it('skips rows with no root post or an anonymised author', () => {
    const result = groupUniqueRepliers([row({ rootPostId: null }), row({ userId: null })]);
    expect(result.size).toBe(0);
  });

  it('prefers the display name and falls back to null rather than a word', () => {
    const result = groupUniqueRepliers([
      row({ userId: 'u1', displayName: 'Alice', username: 'alice' }),
      row({ userId: 'u2', displayName: null, username: null }),
    ]);
    expect(result.get('p1')?.map((r) => r.displayName)).toEqual(['Alice', null]);
  });
});
