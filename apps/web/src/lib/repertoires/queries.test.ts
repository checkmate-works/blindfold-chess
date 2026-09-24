import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { mockChain } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const chain = mockChain([]);

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => chain,
    $count: () => sql`0`,
  },
}));
vi.mock('@/lib/moderation/block');

const { repertoires } = await import('@/lib/db');
const { excludeBlockedAuthors } = await import('@/lib/moderation/block');
const { listPublicRepertoires, listPublicRepertoiresForOpening } = await import('./queries');

const VIEWER = '11111111-1111-1111-1111-111111111111';

/**
 * Hand the next list read a recognisable fragment in place of the block
 * filter, so a test can see whether it reached the WHERE the query ran with.
 */
function stubBlockFilter() {
  vi.mocked(excludeBlockedAuthors).mockResolvedValueOnce(sql`blocked_filter` as never);
}

/** The SQL text of the condition passed to the chain's last `where`. */
function lastWhereSql(): string {
  const where = chain.where as ReturnType<typeof vi.fn>;
  const condition = where.mock.calls.at(-1)?.[0];
  return new PgDialect().sqlToQuery(condition).sql;
}

describe('listPublicRepertoires', () => {
  it('leaves out the authors a signed-in viewer has a block with', async () => {
    stubBlockFilter();

    await listPublicRepertoires(20, 0, undefined, VIEWER);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(repertoires.userId, VIEWER);
    expect(lastWhereSql()).toContain('blocked_filter');
  });

  it('asks for no filter on the anonymous catalog', async () => {
    await listPublicRepertoires(20, 0);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(repertoires.userId, undefined);
  });
});

describe('listPublicRepertoiresForOpening', () => {
  it('leaves out the authors a signed-in viewer has a block with', async () => {
    stubBlockFilter();

    await listPublicRepertoiresForOpening('italian-game', 6, 'new', VIEWER);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(repertoires.userId, VIEWER);
    expect(lastWhereSql()).toContain('blocked_filter');
  });

  it('asks for no filter on the anonymous panel', async () => {
    await listPublicRepertoiresForOpening('italian-game', 6);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(repertoires.userId, undefined);
  });
});
