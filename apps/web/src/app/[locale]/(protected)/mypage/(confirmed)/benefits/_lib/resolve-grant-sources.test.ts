import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import { resolveGrantSources } from './resolve-grant-sources';

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { select: vi.fn() },
}));

const { db } = await import('@/lib/db');
const mockDb = vi.mocked(db);

const dialect = new PgDialect();

type StoredRow = { id: string; deletedAt: Date | null } & Record<string, unknown>;

/**
 * A stand-in for the two source tables, driven by the predicate the query
 * actually carries rather than by what the code under test meant to ask for.
 *
 * It reads the compiled `WHERE` two ways: the table it names selects the row
 * set, and whether it constrains `deleted_at` decides if soft-deleted rows are
 * returned. So a lookup that drops the live filter — the regression these
 * tests exist for — gets its deleted rows back here exactly as Postgres would
 * hand them over, and the resulting map entry (i.e. a rendered link) is what
 * fails the assertion.
 */
function fakeSelect(rowsByTable: Record<string, StoredRow[]>) {
  return () => {
    let rows: StoredRow[] = [];
    const chain = {
      from: () => chain,
      where: (where: SQL | undefined) => {
        if (!where) throw new Error('expected a predicate');
        const { sql, params } = dialect.sqlToQuery(where);
        const table = Object.keys(rowsByTable).find((name) => sql.includes(`"${name}"."id"`));
        const wanted = new Set(params as string[]);
        const excludesDeleted = sql.includes(`"${table}"."deleted_at" is null`);
        rows = (table ? rowsByTable[table] : []).filter(
          (row) => wanted.has(row.id) && (!excludesDeleted || row.deletedAt === null)
        );
        return chain;
      },
      then: (resolve: (value: unknown) => void) =>
        resolve(rows.map(({ deletedAt: _deletedAt, ...projected }) => projected)),
    };
    return chain;
  };
}

const livePost: StoredRow = {
  id: 'post-live',
  topicType: 'opening',
  topicKey: 'french',
  deletedAt: null,
};
const deletedPost: StoredRow = {
  id: 'post-deleted',
  topicType: 'opening',
  topicKey: 'french',
  deletedAt: new Date('2026-08-01T00:00:00Z'),
};
const livePosition: StoredRow = { id: 'pos-live', type: 'puzzle', deletedAt: null };
const deletedPosition: StoredRow = {
  id: 'pos-deleted',
  type: 'puzzle',
  deletedAt: new Date('2026-08-01T00:00:00Z'),
};

function mockTables() {
  mockDb.select.mockImplementation(
    fakeSelect({
      topic_posts: [livePost, deletedPost],
      positions: [livePosition, deletedPosition],
    }) as unknown as typeof mockDb.select
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTables();
});

describe('resolveGrantSources', () => {
  it('maps a grant to the source row its link is built from', async () => {
    const { topicPostMap, positionMap } = await resolveGrantSources([
      { sourceType: 'topic_post', sourceId: 'post-live' },
      { sourceType: 'position', sourceId: 'pos-live' },
    ]);

    expect(topicPostMap.get('post-live')).toEqual({
      id: 'post-live',
      topicType: 'opening',
      topicKey: 'french',
    });
    expect(positionMap.get('pos-live')).toEqual({ id: 'pos-live', type: 'puzzle' });
  });

  it('leaves a soft-deleted source out of both maps, so no link is rendered', async () => {
    const { topicPostMap, positionMap } = await resolveGrantSources([
      { sourceType: 'topic_post', sourceId: 'post-live' },
      { sourceType: 'topic_post', sourceId: 'post-deleted' },
      { sourceType: 'position', sourceId: 'pos-live' },
      { sourceType: 'position', sourceId: 'pos-deleted' },
    ]);

    expect([...topicPostMap.keys()]).toEqual(['post-live']);
    expect([...positionMap.keys()]).toEqual(['pos-live']);
  });

  it('ignores grants whose source is neither a topic post nor a position', async () => {
    const { topicPostMap, positionMap } = await resolveGrantSources([
      { sourceType: 'campaign', sourceId: 'c1' },
      { sourceType: 'topic_post', sourceId: null },
      { sourceType: null, sourceId: null },
    ]);

    expect(topicPostMap.size).toBe(0);
    expect(positionMap.size).toBe(0);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('queries only the source table a grant actually points at', async () => {
    await resolveGrantSources([{ sourceType: 'topic_post', sourceId: 'post-live' }]);

    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });
});
