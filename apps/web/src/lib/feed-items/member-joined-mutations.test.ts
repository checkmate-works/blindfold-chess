import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/**
 * Unit tests for the arrival-announcement mutations.
 *
 * The DB layer is a double that records every INSERT / DELETE / SELECT it
 * sees, and settles `db.transaction` the way drizzle does (commit when the
 * callback resolves, roll back when it throws). What the tests pin down:
 *
 *   - The decision row is the claim: the feed card is inserted only when the
 *     decision INSERT lands, and both inserts share one transaction.
 *   - A lost claim reads the stored outcome back instead of echoing the
 *     caller's button.
 *   - The owner's delete is scoped by id AND type AND actor, and takes the
 *     card's likes with it in the same transaction.
 */

type InsertCall = { table: unknown; values: Record<string, unknown> };
type DeleteCall = { table: unknown; whereArg: unknown };
type SelectCall = { whereArg: unknown };

const state: {
  insertCalls: InsertCall[];
  deleteCalls: DeleteCall[];
  selectCalls: SelectCall[];
  /** What each successive `.returning()` resolves with, in call order. */
  returningResults: unknown[][];
  /** What each successive `.limit()` resolves with, in call order. */
  selectResults: unknown[][];
  transactionOutcomes: Array<'committed' | 'rolledBack'>;
  /** Number of DB calls issued inside a transaction (vs on the root `db`). */
  callsInsideTransaction: number;
} = {
  insertCalls: [],
  deleteCalls: [],
  selectCalls: [],
  returningResults: [],
  selectResults: [],
  transactionOutcomes: [],
  callsInsideTransaction: 0,
};

function resetState() {
  state.insertCalls = [];
  state.deleteCalls = [];
  state.selectCalls = [];
  state.returningResults = [];
  state.selectResults = [];
  state.transactionOutcomes = [];
  state.callsInsideTransaction = 0;
}

vi.mock('@/lib/db', async () => {
  // Built inside the factory: `vi.mock` is hoisted above every top-level
  // binding, so a double declared outside it would not exist yet.
  function makeExecutor(inTransaction: boolean) {
    const count = () => {
      if (inTransaction) state.callsInsideTransaction += 1;
    };
    const nextReturning = () => Promise.resolve(state.returningResults.shift() ?? []);
    const nextSelect = () => Promise.resolve(state.selectResults.shift() ?? []);
    return {
      insert: (table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          count();
          state.insertCalls.push({ table, values });
          const chain = {
            onConflictDoNothing: () => ({ returning: nextReturning }),
            returning: nextReturning,
            // A bare `await tx.insert(...).values(...)` (the feed row).
            then: (resolve: (v: unknown) => void) => resolve(undefined),
          };
          return chain;
        },
      }),
      delete: (table: unknown) => ({
        where: (whereArg: unknown) => {
          count();
          state.deleteCalls.push({ table, whereArg });
          return {
            returning: nextReturning,
            then: (resolve: (v: unknown) => void) => resolve(undefined),
          };
        },
      }),
      select: () => ({
        from: () => ({
          where: (whereArg: unknown) => {
            count();
            state.selectCalls.push({ whereArg });
            return { limit: nextSelect };
          },
        }),
      }),
    };
  }

  const tx = makeExecutor(true);
  const db = {
    ...makeExecutor(false),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      try {
        const value = await fn(tx);
        state.transactionOutcomes.push('committed');
        return value;
      } catch (error) {
        state.transactionOutcomes.push('rolledBack');
        throw error;
      }
    },
  };
  return { ...(await actualDbSchema()), db };
});

const { feedItems, joinAnnouncementDecisions, likes } = await import('@/lib/db');
const {
  decideJoinAnnouncement,
  deleteOwnJoinAnnouncement,
  getJoinAnnouncementOwnerId,
  hasJoinAnnouncementDecision,
} = await import('./member-joined-mutations');

/**
 * Walk a Drizzle predicate looking for a nested value equal to `needle`,
 * without depending on the AST shape (which changes between versions).
 */
function predicateContains(node: unknown, needle: unknown): boolean {
  const seen = new WeakSet<object>();
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === null || cur === undefined) continue;
    if (cur === needle) return true;
    if (typeof cur === 'object') {
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const v of Object.values(cur as Record<string, unknown>)) stack.push(v);
    }
  }
  return false;
}

const USER_ID = 'user-00000000-0000-0000-0000-000000000001';
const OTHER_USER_ID = 'user-00000000-0000-0000-0000-000000000002';
const FEED_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  resetState();
});

describe('decideJoinAnnouncement', () => {
  it('claims the answer and posts the card when the member says yes', async () => {
    state.returningResults = [[{ userId: USER_ID }]];

    const result = await decideJoinAnnouncement(USER_ID, true);

    expect(result).toEqual({ recorded: true, outcome: 'announced' });
    expect(state.insertCalls).toHaveLength(2);
    expect(state.insertCalls[0]).toEqual({
      table: joinAnnouncementDecisions,
      values: { userId: USER_ID, outcome: 'announced' },
    });
    // The member is both subject and actor — there is no separate entity row.
    expect(state.insertCalls[1]).toEqual({
      table: feedItems,
      values: { entityType: 'member_joined', entityId: USER_ID, actorId: USER_ID },
    });
    expect(state.transactionOutcomes).toEqual(['committed']);
  });

  it('records a decline without posting anything', async () => {
    state.returningResults = [[{ userId: USER_ID }]];

    const result = await decideJoinAnnouncement(USER_ID, false);

    expect(result).toEqual({ recorded: true, outcome: 'declined' });
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0].values).toEqual({ userId: USER_ID, outcome: 'declined' });
  });

  it('posts nothing and reports the stored outcome when the claim was already taken', async () => {
    // The conflict swallows the INSERT; the member had posted from another
    // tab, and this call pressed "don't post".
    state.returningResults = [[]];
    state.selectResults = [[{ outcome: 'announced' }]];

    const result = await decideJoinAnnouncement(USER_ID, false);

    expect(result).toEqual({ recorded: false, outcome: 'announced' });
    expect(state.insertCalls.filter((c) => c.table === feedItems)).toHaveLength(0);
    expect(state.selectCalls).toHaveLength(1);
    expect(predicateContains(state.selectCalls[0].whereArg, USER_ID)).toBe(true);
  });

  it('runs the claim and the card insert inside one transaction', async () => {
    state.returningResults = [[{ userId: USER_ID }]];

    await decideJoinAnnouncement(USER_ID, true);

    // Both inserts went through the `tx` handle, none through the root `db`.
    expect(state.callsInsideTransaction).toBe(2);
    expect(state.transactionOutcomes).toEqual(['committed']);
  });
});

describe('deleteOwnJoinAnnouncement', () => {
  it('deletes the card and its likes when the caller owns it', async () => {
    state.returningResults = [[{ id: FEED_ID }]];

    const deleted = await deleteOwnJoinAnnouncement(USER_ID, FEED_ID);

    expect(deleted).toBe(true);
    expect(state.deleteCalls).toHaveLength(2);
    expect(state.deleteCalls[0].table).toBe(feedItems);
    expect(state.deleteCalls[1].table).toBe(likes);
    expect(predicateContains(state.deleteCalls[1].whereArg, 'member_joined')).toBe(true);
    expect(predicateContains(state.deleteCalls[1].whereArg, FEED_ID)).toBe(true);
    // Likes have no FK to cascade through, so the two deletes must commit together.
    expect(state.callsInsideTransaction).toBe(2);
    expect(state.transactionOutcomes).toEqual(['committed']);
  });

  it('deletes no likes and reports false when no card matched', async () => {
    state.returningResults = [[]];

    const deleted = await deleteOwnJoinAnnouncement(OTHER_USER_ID, FEED_ID);

    expect(deleted).toBe(false);
    expect(state.deleteCalls).toHaveLength(1);
    expect(state.deleteCalls[0].table).toBe(feedItems);
  });

  it('scopes the card delete by id, entity type and owner', async () => {
    state.returningResults = [[{ id: FEED_ID }]];

    await deleteOwnJoinAnnouncement(USER_ID, FEED_ID);

    const where = state.deleteCalls[0].whereArg;
    expect(predicateContains(where, FEED_ID)).toBe(true);
    expect(predicateContains(where, 'member_joined')).toBe(true);
    expect(predicateContains(where, USER_ID)).toBe(true);
  });
});

describe('getJoinAnnouncementOwnerId', () => {
  it('returns the actor of a live announcement', async () => {
    state.selectResults = [[{ actorId: USER_ID }]];

    expect(await getJoinAnnouncementOwnerId(FEED_ID)).toBe(USER_ID);
    const where = state.selectCalls[0].whereArg;
    expect(predicateContains(where, FEED_ID)).toBe(true);
    expect(predicateContains(where, 'member_joined')).toBe(true);
  });

  it('returns null when the row is gone or is not an announcement', async () => {
    state.selectResults = [[]];

    expect(await getJoinAnnouncementOwnerId(FEED_ID)).toBeNull();
  });
});

describe('hasJoinAnnouncementDecision', () => {
  it('is true once any outcome is on record', async () => {
    state.selectResults = [[{ userId: USER_ID }]];

    expect(await hasJoinAnnouncementDecision(USER_ID)).toBe(true);
    expect(predicateContains(state.selectCalls[0].whereArg, USER_ID)).toBe(true);
  });

  it('is false for a member who has never been asked', async () => {
    state.selectResults = [[]];

    expect(await hasJoinAnnouncementDecision(USER_ID)).toBe(false);
  });
});
