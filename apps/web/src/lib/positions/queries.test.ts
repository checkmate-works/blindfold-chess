import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { mockChain } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const chain = mockChain([]);

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { select: () => chain },
}));
vi.mock('@/lib/moderation/block');

const { positions } = await import('@/lib/db');
const { excludeBlockedAuthors } = await import('@/lib/moderation/block');
const { listPositionsWithProfile } = await import('./queries');

const VIEWER = '11111111-1111-1111-1111-111111111111';

/** The SQL text of the condition passed to the chain's last `where`. */
function lastWhereSql(): string {
  const where = chain.where as ReturnType<typeof vi.fn>;
  return new PgDialect().sqlToQuery(where.mock.calls.at(-1)?.[0]).sql;
}

describe('listPositionsWithProfile', () => {
  it('leaves out the authors a signed-in viewer has a block with', async () => {
    vi.mocked(excludeBlockedAuthors).mockResolvedValueOnce(sql`blocked_filter` as never);

    await listPositionsWithProfile({ type: 'puzzle', viewerId: VIEWER, limit: 12, offset: 0 });

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(positions.userId, VIEWER);
    expect(lastWhereSql()).toContain('blocked_filter');
  });

  it('asks for no filter on the anonymous catalog', async () => {
    await listPositionsWithProfile({ type: 'puzzle', limit: 12, offset: 0 });

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(positions.userId, undefined);
  });
});
