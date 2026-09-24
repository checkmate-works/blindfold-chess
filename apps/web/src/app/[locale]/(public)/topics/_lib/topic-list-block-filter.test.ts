import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { mockChain } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/**
 * Every top-level post list on a topic page leaves out the posts of someone
 * the signed-in viewer has a block with, and asks for no filter at all on the
 * anonymous read. The filter itself — both block directions, the null-author
 * arm — is covered beside it in `@/lib/moderation/block`; this suite pins that
 * each list actually puts it in the WHERE it runs.
 */

const chain = mockChain([]);

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { select: () => chain },
}));
vi.mock('@/lib/moderation/block');
vi.mock('./post-meta', () => ({
  attachPostMeta: vi.fn(async (posts: unknown[]) => posts),
  attachProfilePostMeta: vi.fn(async (posts: unknown[]) => posts),
}));

const { topicPosts } = await import('@/lib/db');
const { excludeBlockedAuthors } = await import('@/lib/moderation/block');
const {
  getPostsByTopicTypePaginated,
  getPostsWithReplyMetaByTopicKey,
  getPostsWithReplyMetaPaginatedByTopicKey,
} = await import('./queries');
const { getOpeningPostsWithReplyMeta, getPostsAcrossOpeningsPaginated } =
  await import('../openings/_lib/queries');

const VIEWER = '11111111-1111-1111-1111-111111111111';

/** The SQL text of the condition passed to the chain's last `where`. */
function lastWhereSql(): string {
  const where = chain.where as ReturnType<typeof vi.fn>;
  return new PgDialect().sqlToQuery(where.mock.calls.at(-1)?.[0]).sql;
}

const lists: [string, (viewerId?: string) => Promise<unknown>][] = [
  ['one square', (v) => getPostsWithReplyMetaByTopicKey('square', 'e4', v)],
  [
    'one square, paginated',
    (v) => getPostsWithReplyMetaPaginatedByTopicKey('square', 'e4', 20, 0, v),
  ],
  ['every square', (v) => getPostsByTopicTypePaginated('square', 20, 0, v)],
  ['one opening', (v) => getOpeningPostsWithReplyMeta('italian-game', v)],
  ['every opening', (v) => getPostsAcrossOpeningsPaginated(20, 0, v)],
];

describe.each(lists)('the %s post list', (_name, read) => {
  it('leaves out the authors a signed-in viewer has a block with', async () => {
    vi.mocked(excludeBlockedAuthors).mockResolvedValueOnce(sql`blocked_filter` as never);

    await read(VIEWER);

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(topicPosts.userId, VIEWER);
    expect(lastWhereSql()).toContain('blocked_filter');
  });

  it('asks for no filter on the anonymous read', async () => {
    await read();

    expect(excludeBlockedAuthors).toHaveBeenCalledWith(topicPosts.userId, undefined);
  });
});
