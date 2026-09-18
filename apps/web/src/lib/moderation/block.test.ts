import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockBlockRows = vi.fn();

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: () => mockBlockRows(),
      }),
    }),
  },
}));

const { games, feedItems } = await import('@/lib/db');
const { excludeBlockedAuthors, getBlockedUserIds } = await import('./block');

/** Compile a condition to the SQL text + bound parameters Postgres would see. */
const compile = (condition: SQL) => new PgDialect().sqlToQuery(condition);

const VIEWER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const THIRD = '33333333-3333-3333-3333-333333333333';

describe('getBlockedUserIds', () => {
  it('returns the other party of a block the viewer made', async () => {
    mockBlockRows.mockResolvedValue([{ blockerId: VIEWER, blockedId: OTHER }]);

    expect(await getBlockedUserIds(VIEWER)).toEqual([OTHER]);
  });

  it('returns the other party of a block made against the viewer', async () => {
    mockBlockRows.mockResolvedValue([{ blockerId: OTHER, blockedId: VIEWER }]);

    expect(await getBlockedUserIds(VIEWER)).toEqual([OTHER]);
  });

  // A pair that blocked each other has two rows, and both name the same
  // counterparty — a duplicate would be harmless in the SQL but would make the
  // "no blocks" short-circuit in excludeBlockedAuthors harder to reason about.
  it('lists a mutual block once', async () => {
    mockBlockRows.mockResolvedValue([
      { blockerId: VIEWER, blockedId: OTHER },
      { blockerId: OTHER, blockedId: VIEWER },
    ]);

    expect(await getBlockedUserIds(VIEWER)).toEqual([OTHER]);
  });

  it('returns an empty list when the viewer is in no block relationship', async () => {
    mockBlockRows.mockResolvedValue([]);

    expect(await getBlockedUserIds(VIEWER)).toEqual([]);
  });
});

describe('excludeBlockedAuthors', () => {
  it('adds nothing for a signed-out viewer, without querying', async () => {
    mockBlockRows.mockClear();

    expect(await excludeBlockedAuthors(games.authorId, undefined)).toBeUndefined();
    expect(mockBlockRows).not.toHaveBeenCalled();
  });

  it('adds nothing for a viewer who has blocked nobody', async () => {
    mockBlockRows.mockResolvedValue([]);

    expect(await excludeBlockedAuthors(games.authorId, VIEWER)).toBeUndefined();
  });

  // The `IS NULL` arm is the whole reason this helper exists rather than a
  // bare notInArray: without it, `author_id NOT IN (...)` is NULL — not true —
  // for an account-less game, so every anonymous row would drop out of the
  // list as soon as the viewer blocked anyone.
  it('keeps rows with no author while excluding the blocked ones', async () => {
    mockBlockRows.mockResolvedValue([
      { blockerId: VIEWER, blockedId: OTHER },
      { blockerId: THIRD, blockedId: VIEWER },
    ]);

    const condition = await excludeBlockedAuthors(games.authorId, VIEWER);

    expect(condition).toBeDefined();
    const { sql, params } = compile(condition!);
    expect(sql).toContain('"author_id" is null');
    expect(sql).toContain('not in');
    expect(params).toEqual(expect.arrayContaining([OTHER, THIRD]));
  });

  it('builds the same fragment for a not-null author column', async () => {
    mockBlockRows.mockResolvedValue([{ blockerId: VIEWER, blockedId: OTHER }]);

    const condition = await excludeBlockedAuthors(feedItems.actorId, VIEWER);

    expect(condition).toBeDefined();
    const { sql, params } = compile(condition!);
    expect(sql).toContain('"actor_id" not in');
    expect(params).toEqual([OTHER]);
  });
});
