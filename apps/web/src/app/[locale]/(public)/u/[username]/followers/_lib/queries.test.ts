import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockChain } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const chain = mockChain([]);

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { select: () => chain },
}));
vi.mock('@/lib/moderation/block');

const { userFollows } = await import('@/lib/db');
const { excludeBlockedAuthors } = await import('@/lib/moderation/block');
const { countVisibleFollowers, listVisibleFollowers } = await import('./queries');

const PROFILE = '22222222-2222-2222-2222-222222222222';
const VIEWER = '11111111-1111-1111-1111-111111111111';

/** The SQL text of the condition passed to the chain's last `where`. */
function lastWhereSql(): string {
  const where = chain.where as ReturnType<typeof vi.fn>;
  return new PgDialect().sqlToQuery(where.mock.calls.at(-1)?.[0]).sql;
}

beforeEach(() => {
  vi.mocked(excludeBlockedAuthors).mockClear();
});

describe('listVisibleFollowers', () => {
  it('leaves out the followers a signed-in viewer has a block with', async () => {
    vi.mocked(excludeBlockedAuthors).mockResolvedValueOnce(sql`blocked_filter` as never);

    await listVisibleFollowers(PROFILE, VIEWER, { limit: 10, offset: 0 });

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(userFollows.followerId, VIEWER);
    expect(lastWhereSql()).toContain('blocked_filter');
  });

  it('asks for no filter when nobody is signed in', async () => {
    await listVisibleFollowers(PROFILE, undefined, { limit: 10, offset: 0 });

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(userFollows.followerId, undefined);
  });
});

describe('countVisibleFollowers', () => {
  // The count pages the list, so it must drop the same rows or the pager
  // offers a last page the list has nothing to fill.
  it('applies the same block filter as the list', async () => {
    vi.mocked(excludeBlockedAuthors).mockResolvedValueOnce(sql`blocked_filter` as never);

    await countVisibleFollowers(PROFILE, VIEWER);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(userFollows.followerId, VIEWER);
    expect(lastWhereSql()).toContain('blocked_filter');
  });
});
