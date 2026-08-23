import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { profiles } from '@/lib/db/schema';

import { ACCOUNT_PURGE_RETENTION_MS, purgeDeletedAccounts } from './purge-deleted-accounts';

const mockDeleteUser = vi.fn();

// Configurable result of the eligible-accounts query.
let mockTargets: { id: string }[] = [];
const mockLimit = vi.fn((_limit?: number) => Promise.resolve(mockTargets));
const mockOrderBy = vi.fn((..._args: unknown[]) => ({ limit: mockLimit }));
const mockWhere = vi.fn((..._args: unknown[]) => ({ orderBy: mockOrderBy }));
const mockFrom = vi.fn((..._args: unknown[]) => ({ where: mockWhere }));
const mockSelect = vi.fn((..._args: unknown[]) => ({ from: mockFrom }));

vi.mock('@sentry/nextjs');

// Passthrough capturers so the mocked db chain ignores the conditions while we
// can still assert the retention predicate was built from the right column.
vi.mock('drizzle-orm', () => ({
  and: (...conds: unknown[]) => ({ __and: conds }),
  isNotNull: (column: unknown) => ({ __isNotNull: column }),
  lt: (column: unknown, value: unknown) => ({ __lt: [column, value] }),
  asc: (column: unknown) => ({ __asc: column }),
}));

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { select: (...args: unknown[]) => mockSelect(...args) },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser: mockDeleteUser } },
  }),
}));

const NOW = new Date('2026-06-18T00:00:00.000Z');

describe('purgeDeletedAccounts', () => {
  beforeEach(() => {
    mockTargets = [];
    mockLimit.mockImplementation((_limit?: number) => Promise.resolve(mockTargets));
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  it('hard-deletes every eligible account and reports the count', async () => {
    mockTargets = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];

    const report = await purgeDeletedAccounts({ now: NOW });

    expect(mockDeleteUser).toHaveBeenCalledTimes(3);
    // Hard delete = no second argument (the soft-delete path passes `true`).
    expect(mockDeleteUser).toHaveBeenCalledWith('u1');
    expect(mockDeleteUser.mock.calls.every((c) => c.length === 1)).toBe(true);
    expect(report).toMatchObject({ purged: 3, failed: 0, scanned: 3, timedOut: false });
  });

  it('selects only accounts soft-deleted before now − retention', async () => {
    const report = await purgeDeletedAccounts({ now: NOW });

    const cutoff = new Date(NOW.getTime() - ACCOUNT_PURGE_RETENTION_MS);
    const whereArg = mockWhere.mock.calls[0][0] as {
      __and: [{ __isNotNull: unknown }, { __lt: [unknown, Date] }];
    };
    expect(whereArg.__and[0]).toEqual({ __isNotNull: profiles.deletedAt });
    expect(whereArg.__and[1].__lt[0]).toBe(profiles.deletedAt);
    expect(whereArg.__and[1].__lt[1].toISOString()).toBe(cutoff.toISOString());
    // Report echoes the same cutoff.
    expect(report.cutoff).toBe(cutoff.toISOString());
  });

  it('is best-effort: an errored delete is counted, not thrown, and the batch continues', async () => {
    mockTargets = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];
    mockDeleteUser
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'boom' } })
      .mockResolvedValueOnce({ error: null });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const report = await purgeDeletedAccounts({ now: NOW });

    expect(mockDeleteUser).toHaveBeenCalledTimes(3);
    expect(report).toMatchObject({ purged: 2, failed: 1, scanned: 3 });
    errSpy.mockRestore();
  });

  it('is best-effort: a thrown delete is caught and the batch continues', async () => {
    mockTargets = [{ id: 'u1' }, { id: 'u2' }];
    mockDeleteUser
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ error: null });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const report = await purgeDeletedAccounts({ now: NOW });

    expect(report).toMatchObject({ purged: 1, failed: 1, scanned: 2 });
    errSpy.mockRestore();
  });

  it('stops and flags timedOut when the wall-clock budget is exhausted', async () => {
    mockTargets = [{ id: 'u1' }, { id: 'u2' }];

    // A negative budget puts the deadline in the past, so the loop bails before
    // touching any account.
    const report = await purgeDeletedAccounts({ now: NOW, budgetMs: -1 });

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(report).toMatchObject({ purged: 0, failed: 0, scanned: 2, timedOut: true });
  });

  it('passes maxPerRun as the query limit', async () => {
    await purgeDeletedAccounts({ now: NOW, maxPerRun: 50 });
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});
