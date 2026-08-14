import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RANK_UPDATE_ENTITY_TYPE,
  RANK_UPDATE_RETENTION_MS,
  reapOldRankUpdateFeedItems,
} from './reap-old-rank-updates';

/**
 * Pure-logic unit tests for the rank-update reaper.
 *
 * The DB layer is stubbed; we verify:
 *   - The SELECT predicate restricts to `entity_type =
 *     'challenge_rank_update'` AND `created_at < cutoff` so that
 *     `topic_post` rows can never be reaped, even if the DB-side
 *     filter were misconfigured at a higher layer.
 *   - The batched DELETE loop terminates when a SELECT returns fewer
 *     rows than the batch size (drained), and continues otherwise.
 *   - The wall-clock budget short-circuits the loop and surfaces
 *     `timedOut: true` in the report.
 *   - The report shape and counters match the documented contract.
 *
 * We do NOT test actual SQL emission — Drizzle's `eq()` / `lt()` / `and()`
 * are trusted to compose the predicate they are documented to produce.
 * We only assert that the literals we depend on (entity-type guard,
 * cutoff timestamp) appear inside the predicate object.
 */

type SelectCall = {
  whereArg: unknown;
  limit: number;
};

type DeleteCall = {
  whereArg: unknown;
};

const state: {
  selectCalls: SelectCall[];
  deleteCalls: DeleteCall[];
  selectResults: Array<{ id: string }[]>;
  selectDelayMs: number;
} = {
  selectCalls: [],
  deleteCalls: [],
  selectResults: [],
  selectDelayMs: 0,
};

function resetState() {
  state.selectCalls = [];
  state.deleteCalls = [];
  state.selectResults = [];
  state.selectDelayMs = 0;
}

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (whereArg: unknown) => ({
          orderBy: () => ({
            limit: (limit: number) => {
              state.selectCalls.push({ whereArg, limit });
              const idx = state.selectCalls.length - 1;
              const result = state.selectResults[idx] ?? [];
              if (state.selectDelayMs > 0) {
                return new Promise((resolve) => {
                  setTimeout(() => resolve(result), state.selectDelayMs);
                });
              }
              return Promise.resolve(result);
            },
          }),
        }),
      }),
    }),
    delete: () => ({
      where: (whereArg: unknown) => {
        state.deleteCalls.push({ whereArg });
        return Promise.resolve();
      },
    }),
  },
  feedItems: { id: 'id', entityType: 'entity_type', createdAt: 'created_at' },
}));

/**
 * Walk a Drizzle predicate object looking for any nested value that
 * deep-equals `needle`. Used to assert that the predicate carries the
 * entity-type literal and the cutoff timestamp without depending on
 * Drizzle's internal AST shape (which changes between versions).
 */
function predicateContains(node: unknown, needle: unknown): boolean {
  const seen = new WeakSet<object>();
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === null || cur === undefined) continue;
    if (cur === needle) return true;
    if (needle instanceof Date && cur instanceof Date && cur.getTime() === needle.getTime()) {
      return true;
    }
    if (typeof cur === 'object') {
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const v of Object.values(cur as Record<string, unknown>)) {
        stack.push(v);
      }
    }
  }
  return false;
}

function makeRows(prefix: string, count: number): { id: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}` }));
}

describe('reapOldRankUpdateFeedItems', () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports the documented retention window (30 days)', () => {
    expect(RANK_UPDATE_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('exports the entity-type guard literal', () => {
    expect(RANK_UPDATE_ENTITY_TYPE).toBe('challenge_rank_update');
  });

  it('returns zero counts when nothing is reapable', async () => {
    state.selectResults = [[]];

    const now = new Date('2026-05-04T00:00:00Z');
    const report = await reapOldRankUpdateFeedItems({ now });

    expect(report).toMatchObject({
      removed: 0,
      batches: 0,
      timedOut: false,
      startedAt: now.toISOString(),
    });
    expect(typeof report.finishedAt).toBe('string');
    expect(state.selectCalls).toHaveLength(1);
    expect(state.deleteCalls).toHaveLength(0);
  });

  it('always restricts the SELECT to entity_type = challenge_rank_update (topic_post is never reaped)', async () => {
    state.selectResults = [[]];

    const now = new Date('2026-05-04T00:00:00Z');
    await reapOldRankUpdateFeedItems({ now });

    // The literal entity-type guard must be embedded in the predicate.
    // If a future refactor drops the filter, the WHERE arg will no
    // longer contain this string and this test fails loudly — exactly
    // the regression we care about, because losing the guard would
    // delete topic_post rows on the next cron run.
    expect(state.selectCalls[0]).toBeDefined();
    expect(predicateContains(state.selectCalls[0].whereArg, 'challenge_rank_update')).toBe(true);
  });

  it('embeds the cutoff (now - 30d) in the SELECT predicate', async () => {
    state.selectResults = [[]];

    const now = new Date('2026-05-04T00:00:00Z');
    const expectedCutoff = new Date(now.getTime() - RANK_UPDATE_RETENTION_MS);
    await reapOldRankUpdateFeedItems({ now });

    expect(predicateContains(state.selectCalls[0].whereArg, expectedCutoff)).toBe(true);
  });

  it('deletes the selected IDs and counts them in the report', async () => {
    state.selectResults = [makeRows('rank', 3), []];

    const now = new Date('2026-05-04T00:00:00Z');
    const report = await reapOldRankUpdateFeedItems({ now, batchSize: 5000 });

    // Single batch was full neither (3 < 5000) so the loop exits after
    // one SELECT + DELETE without a follow-up probe.
    expect(state.deleteCalls).toHaveLength(1);
    expect(report.removed).toBe(3);
    expect(report.batches).toBe(1);
    expect(report.timedOut).toBe(false);
  });

  it('loops across multiple full batches until a partial batch drains the backlog', async () => {
    // 3 full batches of 100, then 40, then []. Loop should exit on the
    // partial batch without issuing the trailing probe SELECT.
    state.selectResults = [makeRows('a', 100), makeRows('b', 100), makeRows('c', 40)];

    const now = new Date('2026-05-04T00:00:00Z');
    const report = await reapOldRankUpdateFeedItems({ now, batchSize: 100 });

    expect(state.selectCalls).toHaveLength(3);
    expect(state.deleteCalls).toHaveLength(3);
    expect(report.removed).toBe(240);
    expect(report.batches).toBe(3);
    expect(report.timedOut).toBe(false);
  });

  it('issues a trailing empty SELECT when the previous batch was exactly full', async () => {
    // 2 full batches followed by an empty probe — this is the contract
    // that lets us know we've drained when batches happen to align with
    // the batch size.
    state.selectResults = [makeRows('a', 100), makeRows('b', 100), []];

    const now = new Date('2026-05-04T00:00:00Z');
    const report = await reapOldRankUpdateFeedItems({ now, batchSize: 100 });

    expect(state.selectCalls).toHaveLength(3);
    expect(state.deleteCalls).toHaveLength(2);
    expect(report.removed).toBe(200);
    expect(report.batches).toBe(2);
    expect(report.timedOut).toBe(false);
  });

  it('honors the wall-clock budget and marks the report as timedOut', async () => {
    // 4 full batches available, but the budget allows only 2 iterations
    // before the deadline fires. We simulate slow SELECTs so the loop's
    // pre-batch deadline check trips after batches 1 and 2 complete.
    state.selectResults = [
      makeRows('a', 100),
      makeRows('b', 100),
      makeRows('c', 100),
      makeRows('d', 100),
    ];
    state.selectDelayMs = 30; // each batch takes ~30ms

    const now = new Date('2026-05-04T00:00:00Z');
    const report = await reapOldRankUpdateFeedItems({
      now,
      batchSize: 100,
      budgetMs: 50, // expect to finish 1–2 batches before exceeding
    });

    expect(report.timedOut).toBe(true);
    expect(report.batches).toBeGreaterThanOrEqual(1);
    expect(report.batches).toBeLessThan(4);
    expect(report.removed).toBe(report.batches * 100);
  });
});
