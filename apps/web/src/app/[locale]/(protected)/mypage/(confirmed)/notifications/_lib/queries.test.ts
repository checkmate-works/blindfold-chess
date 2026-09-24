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

const { notifications } = await import('@/lib/db');
const { excludeBlockedAuthors } = await import('@/lib/moderation/block');
const { getNotifications, getUnreadCount } = await import('./queries');

const RECIPIENT = '11111111-1111-1111-1111-111111111111';

/** The SQL text of every condition handed to the chain's `where`. */
function whereSqls(): string[] {
  const where = chain.where as ReturnType<typeof vi.fn>;
  return where.mock.calls.map(([cond]) => new PgDialect().sqlToQuery(cond).sql);
}

beforeEach(() => {
  vi.mocked(excludeBlockedAuthors).mockClear().mockResolvedValue(undefined);
  (chain.where as ReturnType<typeof vi.fn>).mockClear();
});

describe('getNotifications', () => {
  it('leaves out notifications whose actor is in a block with the recipient', async () => {
    vi.mocked(excludeBlockedAuthors).mockResolvedValue(sql`blocked_filter` as never);

    await getNotifications(RECIPIENT, 1);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(notifications.actorId, RECIPIENT);
    // Both the count that sizes the pager and the page itself.
    const sqls = whereSqls();
    expect(sqls).toHaveLength(2);
    for (const s of sqls) expect(s).toContain('blocked_filter');
  });
});

describe('getUnreadCount', () => {
  it('counts only the notifications the list would show', async () => {
    vi.mocked(excludeBlockedAuthors).mockResolvedValueOnce(sql`blocked_filter` as never);

    await getUnreadCount(RECIPIENT);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(notifications.actorId, RECIPIENT);
    expect(whereSqls().at(-1)).toContain('blocked_filter');
  });
});
