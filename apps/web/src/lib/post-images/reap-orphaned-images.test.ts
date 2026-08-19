import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import { REAP_RETENTION_MS, reapOrphanedPostImages } from './reap-orphaned-images';

/**
 * Pure-logic unit tests for the reaper. The DB and Storage layers are
 * stubbed; we exercise the function's branching, batching, and report
 * shape — not Drizzle SQL or Supabase RLS.
 *
 * Mock model:
 *   - The DB stub captures `select(...).from(...).innerJoin(...).where(...)`
 *     and resolves with whatever rows the test queues via `setSelectRows`.
 *   - The DB stub also captures `delete(...).where(...)` calls into a
 *     log so we can assert which attachment IDs were hard-deleted.
 *   - The admin Storage stub captures `from(bucket).remove(paths)` calls
 *     and resolves with `{ error: null }` by default; tests can queue
 *     errors via `setStorageRemoveResults`.
 *
 * What we DO NOT test here:
 *   - The actual SQL that Drizzle emits (the predicate object is passed
 *     through to the stubbed `where`; we only inspect that the function
 *     CALLED `where` with non-null args and that the row set we hand
 *     back drives the right downstream behavior).
 *   - Storage RLS or Supabase Storage semantics.
 *   - Race conditions / concurrent runs.
 */

type Row = { attachmentId: string; storagePath: string };

const state: {
  selectRows: Row[];
  storageRemoveResults: Array<{ error: { message: string } | null }>;
  removeCalls: string[][];
  deletedIdSets: string[][];
  dbDeleteThrows: boolean[];
  whereArgs: unknown[];
} = {
  selectRows: [],
  storageRemoveResults: [],
  removeCalls: [],
  deletedIdSets: [],
  dbDeleteThrows: [],
  whereArgs: [],
};

function resetState() {
  state.selectRows = [];
  state.storageRemoveResults = [];
  state.removeCalls = [];
  state.deletedIdSets = [];
  state.dbDeleteThrows = [];
  state.whereArgs = [];
}

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: (...args: unknown[]) => {
            state.whereArgs.push(...args);
            return Promise.resolve(state.selectRows);
          },
        }),
      }),
    }),
    delete: () => ({
      where: (predicate: unknown) => {
        // Best-effort introspection: extract the IN-list of attachment
        // ids from the Drizzle predicate. Drizzle wraps inArray(...) as
        // an SQL object; we sniff for any `value` array containing
        // strings. Falls back to an empty array if the shape changes.
        const ids = extractIds(predicate);
        // Honor the queued throw flag for this call.
        const idx = state.deletedIdSets.length;
        state.deletedIdSets.push(ids);
        if (state.dbDeleteThrows[idx]) {
          return Promise.reject(new Error('mock db delete failure'));
        }
        return Promise.resolve();
      },
    }),
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: (_bucket: string) => ({
        remove: (paths: string[]) => {
          state.removeCalls.push([...paths]);
          const idx = state.removeCalls.length - 1;
          const result = state.storageRemoveResults[idx] ?? { error: null };
          return Promise.resolve(result);
        },
      }),
    },
  }),
}));

/**
 * Walk an unknown Drizzle predicate looking for the IN-list of attachment
 * IDs that the reaper packages into `inArray(...)`.
 *
 * Drizzle serializes `inArray(col, ids)` as an SQL object with a
 * `queryChunks` array; the IDs appear as one of the chunks, each bound value
 * wrapped in a `Param`. We match on the `att-` prefix of our fixture so we
 * don't false-match the SQL syntax chunks like `[""]` or `[" in "]` that also
 * satisfy "array of strings".
 */
function unwrapAttachmentId(node: unknown): string | null {
  if (typeof node === 'string') return node.startsWith('att-') ? node : null;
  if (node !== null && typeof node === 'object' && 'value' in node) {
    const value = (node as { value: unknown }).value;
    return typeof value === 'string' && value.startsWith('att-') ? value : null;
  }
  return null;
}

function extractIds(node: unknown): string[] {
  const seen = new Set<unknown>();
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === null || cur === undefined) continue;
    if (typeof cur !== 'object') continue;
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (Array.isArray(cur) && cur.length > 0) {
      const ids = cur.map(unwrapAttachmentId);
      if (ids.every((id) => id !== null)) return ids as string[];
    }
    for (const v of Object.values(cur as Record<string, unknown>)) {
      stack.push(v);
    }
  }
  return [];
}

describe('reapOrphanedPostImages', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns the documented report shape with zero counts when nothing is reapable', async () => {
    state.selectRows = [];
    const report = await reapOrphanedPostImages(new Date('2026-05-04T00:00:00Z'));
    expect(report).toMatchObject({
      reapedAttachmentRows: 0,
      reapedStorageObjects: 0,
      errors: 0,
    });
    expect(typeof report.startedAt).toBe('string');
    expect(typeof report.finishedAt).toBe('string');
    expect(state.removeCalls).toHaveLength(0);
    expect(state.deletedIdSets).toHaveLength(0);
  });

  it('reaps attachments whose parent post deletedAt is older than the cutoff', async () => {
    // The DB stub returns whatever we queue regardless of the predicate
    // (we tested the predicate at the SQL level via the M1 fix; here we
    // simulate the rows the predicate WOULD have returned).
    const targets: Row[] = [
      { attachmentId: 'att-1', storagePath: 'u1/p1/r1.jpg' },
      { attachmentId: 'att-2', storagePath: 'u1/p1/r2.png' },
    ];
    state.selectRows = targets;

    const report = await reapOrphanedPostImages(new Date('2026-05-04T00:00:00Z'));

    expect(state.removeCalls).toEqual([['u1/p1/r1.jpg', 'u1/p1/r2.png']]);
    expect(state.deletedIdSets).toEqual([['att-1', 'att-2']]);
    expect(report.reapedStorageObjects).toBe(2);
    expect(report.reapedAttachmentRows).toBe(2);
    expect(report.errors).toBe(0);
  });

  it('does NOT reap when the SELECT returns no rows (parent within cutoff or alive)', async () => {
    // The predicate filtering happens DB-side. From this layer's POV,
    // "nothing to do" means SELECT returned []. This covers the
    // newer-than-cutoff and alive-parent cases together.
    state.selectRows = [];

    await reapOrphanedPostImages(new Date('2026-05-04T00:00:00Z'));

    expect(state.removeCalls).toHaveLength(0);
    expect(state.deletedIdSets).toHaveLength(0);
  });

  it('does NOT delete the DB row when the storage remove fails for a batch', async () => {
    state.selectRows = [{ attachmentId: 'att-1', storagePath: 'u1/p1/r1.jpg' }];
    state.storageRemoveResults = [{ error: { message: 'transient s3 outage' } }];

    const report = await reapOrphanedPostImages(new Date('2026-05-04T00:00:00Z'));

    expect(state.removeCalls).toEqual([['u1/p1/r1.jpg']]);
    expect(state.deletedIdSets).toHaveLength(0); // DB delete must not run
    expect(report.reapedStorageObjects).toBe(0);
    expect(report.reapedAttachmentRows).toBe(0);
    expect(report.errors).toBe(1);
  });

  it('counts a DB-delete failure as an error and does NOT inflate reapedAttachmentRows', async () => {
    state.selectRows = [{ attachmentId: 'att-1', storagePath: 'u1/p1/r1.jpg' }];
    state.storageRemoveResults = [{ error: null }];
    state.dbDeleteThrows = [true];

    const report = await reapOrphanedPostImages(new Date('2026-05-04T00:00:00Z'));

    // Storage remove DID succeed in this scenario; the DB delete failed.
    expect(report.reapedStorageObjects).toBe(1);
    expect(report.reapedAttachmentRows).toBe(0);
    expect(report.errors).toBe(1);
  });

  it('batches storage removes by 100 keys per call', async () => {
    // 250 rows → 3 batches of (100, 100, 50).
    const rows: Row[] = Array.from({ length: 250 }, (_, i) => ({
      attachmentId: `att-${i}`,
      storagePath: `u/p/r${i}.jpg`,
    }));
    state.selectRows = rows;

    const report = await reapOrphanedPostImages(new Date('2026-05-04T00:00:00Z'));

    expect(state.removeCalls).toHaveLength(3);
    expect(state.removeCalls[0]).toHaveLength(100);
    expect(state.removeCalls[1]).toHaveLength(100);
    expect(state.removeCalls[2]).toHaveLength(50);
    expect(report.reapedStorageObjects).toBe(250);
    expect(report.reapedAttachmentRows).toBe(250);
    expect(report.errors).toBe(0);
  });

  it('continues reaping subsequent batches even when an earlier batch errors', async () => {
    // 150 rows → batch 0 (100 keys) errors, batch 1 (50 keys) succeeds.
    const rows: Row[] = Array.from({ length: 150 }, (_, i) => ({
      attachmentId: `att-${i}`,
      storagePath: `u/p/r${i}.jpg`,
    }));
    state.selectRows = rows;
    state.storageRemoveResults = [{ error: { message: 'transient' } }, { error: null }];

    const report = await reapOrphanedPostImages(new Date('2026-05-04T00:00:00Z'));

    expect(state.removeCalls).toHaveLength(2);
    expect(state.deletedIdSets).toHaveLength(1); // only the successful batch deleted DB rows
    expect(report.reapedStorageObjects).toBe(50);
    expect(report.reapedAttachmentRows).toBe(50);
    expect(report.errors).toBe(1);
  });

  it('echoes the supplied `now` into report.startedAt (deterministic time injection)', async () => {
    // Sanity: the function accepts a `now` arg so callers can pin the
    // cutoff for tests / debugging. We assert the round-trip only —
    // richer cutoff coverage is implicit in the empty-rows case above.
    state.selectRows = [];
    const t0 = new Date('2020-01-01T00:00:00Z'); // safely in the past
    const report = await reapOrphanedPostImages(t0);
    expect(report.startedAt).toBe(t0.toISOString());
    // finishedAt is whatever `new Date()` evaluated at the end; it
    // should parse to a time strictly >= startedAt.
    expect(new Date(report.finishedAt).getTime()).toBeGreaterThanOrEqual(t0.getTime());
  });

  it('exports the documented retention window (7 days)', () => {
    expect(REAP_RETENTION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
