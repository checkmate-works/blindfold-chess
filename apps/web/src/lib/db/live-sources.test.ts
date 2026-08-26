import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { gameAiReviewJobs, games, topicPosts } from '@/lib/db/schema';

import { selectLiveByIds } from './live-sources';

const dialect = new PgDialect();

/** Render the predicate the helper composed, as the driver would receive it. */
function compile(where: SQL | undefined): { sql: string; params: unknown[] } {
  if (!where) throw new Error('expected a predicate');
  const query = dialect.sqlToQuery(where);
  return { sql: query.sql, params: query.params };
}

describe('selectLiveByIds', () => {
  it('restricts the id lookup to rows that are not soft-deleted', async () => {
    const select = vi.fn(async (where: SQL | undefined) => {
      const { sql, params } = compile(where);
      expect(sql).toBe('("topic_posts"."id" in ($1, $2) and "topic_posts"."deleted_at" is null)');
      expect(params).toEqual(['t1', 't2']);
      return [{ id: 't1' }];
    });

    const rows = await selectLiveByIds({
      ids: ['t1', 't2'],
      idColumn: topicPosts.id,
      deletedAtColumn: topicPosts.deletedAt,
      select,
    });

    expect(rows).toEqual([{ id: 't1' }]);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('runs no query for an empty id list', async () => {
    const select = vi.fn(async () => [{ id: 'unreachable' }]);

    const rows = await selectLiveByIds({
      ids: [],
      idColumn: topicPosts.id,
      deletedAtColumn: topicPosts.deletedAt,
      select,
    });

    expect(rows).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it('accepts a soft-delete marker on another table, for lookups that join', async () => {
    // The AI review history matches job ids but must judge liveness by the
    // joined game, which is the row that can be deleted.
    const select = vi.fn(async (where: SQL | undefined) => {
      expect(compile(where).sql).toBe(
        '("game_ai_review_jobs"."id" in ($1) and "games"."deleted_at" is null)'
      );
      return [];
    });

    await selectLiveByIds({
      ids: ['job1'],
      idColumn: gameAiReviewJobs.id,
      deletedAtColumn: games.deletedAt,
      select,
    });

    expect(select).toHaveBeenCalledTimes(1);
  });
});
