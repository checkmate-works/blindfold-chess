import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelectFromWhere = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          return mockSelectFromWhere(...args);
        },
      }),
    }),
  },
  userGrants: {
    id: 'id',
    userId: 'user_id',
    benefitType: 'benefit_type',
    startsAt: 'starts_at',
    expiresAt: 'expires_at',
    revokedAt: 'revoked_at',
  },
}));

vi.mock('@/lib/db-timeout', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock('server-only', () => ({}));

const { applyAutomatedGrant, calcGrantStartsAt } = await import('./user-grants');

type TxParam = Parameters<typeof applyAutomatedGrant>[0];

type InsertedValues = {
  userId: string;
  benefitType: string;
  grantType: string;
  sourceType: string | null;
  sourceId: string | null;
  startsAt: Date;
  expiresAt: Date;
};

function createMockTx(existingActive: Array<{ expiresAt: Date }>) {
  const captured: { values?: InsertedValues } = {};
  const forMock = vi.fn(async (_mode: string) => existingActive);
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          for: forMock,
        }),
      }),
    }),
    insert: () => ({
      values: (v: InsertedValues) => {
        captured.values = v;
        return {
          returning: async () => [{ id: 'new-grant-id' }],
        };
      },
    }),
  };
  return { tx, captured, forMock };
}

describe('calcGrantStartsAt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should return current time when user has no existing grants', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    mockSelectFromWhere.mockResolvedValue([{ maxExpires: null }]);

    const result = await calcGrantStartsAt('user-123', 'ad_free');
    expect(result.getTime()).toBe(now.getTime());
  });

  it('should return current time when all existing grants are expired', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const pastDate = new Date('2026-04-01T12:00:00Z');
    mockSelectFromWhere.mockResolvedValue([{ maxExpires: pastDate }]);

    const result = await calcGrantStartsAt('user-123', 'ad_free');
    expect(result.getTime()).toBe(now.getTime());
  });

  it('should return the future expiration date when an active grant exists (stacking)', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const futureDate = new Date('2026-05-08T12:00:00Z');
    mockSelectFromWhere.mockResolvedValue([{ maxExpires: futureDate }]);

    const result = await calcGrantStartsAt('user-123', 'ad_free');
    expect(result.getTime()).toBe(futureDate.getTime());
  });

  it('should return current time when only revoked grants exist (revoked grants are ignored)', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    // Revoked grants are excluded by the WHERE clause (isNull(revokedAt)),
    // so the DB returns null for maxExpires when only revoked grants exist.
    mockSelectFromWhere.mockResolvedValue([{ maxExpires: null }]);

    const result = await calcGrantStartsAt('user-123', 'ad_free');
    expect(result.getTime()).toBe(now.getTime());
  });
});

describe('applyAutomatedGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  it('applies a fresh grant when no existing active grants', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const { tx, captured } = createMockTx([]);

    const result = await applyAutomatedGrant(tx as unknown as TxParam, 'user-123', 'topic_post', {
      type: 'topic_post',
      id: 'post-abc',
    });

    expect(captured.values).toBeDefined();
    expect(captured.values!.userId).toBe('user-123');
    expect(captured.values!.benefitType).toBe('ad_free');
    expect(captured.values!.grantType).toBe('topic_post');
    expect(captured.values!.sourceType).toBe('topic_post');
    expect(captured.values!.sourceId).toBe('post-abc');
    expect(captured.values!.startsAt.getTime()).toBe(now.getTime());
    expect(captured.values!.expiresAt.getTime()).toBe(now.getTime() + SEVEN_DAYS_MS);
    expect(result.grantId).toBe('new-grant-id');
    expect(result.expiresAt.getTime()).toBe(now.getTime() + SEVEN_DAYS_MS);
  });

  it('stacks on top of latest existing active grant', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const existingExpires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const { tx, captured } = createMockTx([{ expiresAt: existingExpires }]);

    await applyAutomatedGrant(tx as unknown as TxParam, 'user-123', 'topic_post', {
      type: 'topic_post',
      id: 'post-abc',
    });

    expect(captured.values!.startsAt.getTime()).toBe(existingExpires.getTime());
    expect(captured.values!.expiresAt.getTime()).toBe(existingExpires.getTime() + SEVEN_DAYS_MS);
  });

  it('leaves source* NULL when source argument is omitted', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const { tx, captured } = createMockTx([]);

    await applyAutomatedGrant(tx as unknown as TxParam, 'user-123', 'topic_post');

    expect(captured.values!.sourceType).toBeNull();
    expect(captured.values!.sourceId).toBeNull();
  });

  it('uses the policy duration from GRANT_TYPE_DEFAULTS', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const { tx, captured } = createMockTx([]);

    await applyAutomatedGrant(tx as unknown as TxParam, 'user-123', 'topic_post', {
      type: 'topic_post',
      id: 'post-abc',
    });

    const delta = captured.values!.expiresAt.getTime() - captured.values!.startsAt.getTime();
    expect(delta).toBe(SEVEN_DAYS_MS);
  });

  it('requests a row-level lock via .for("update")', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const { tx, forMock } = createMockTx([]);

    await applyAutomatedGrant(tx as unknown as TxParam, 'user-123', 'topic_post');

    expect(forMock).toHaveBeenCalledWith('update');
  });

  it('does not call revalidateTag internally', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-08T12:00:00Z');
    vi.setSystemTime(now);

    const { revalidateTag } = await import('next/cache');
    const { tx } = createMockTx([]);

    await applyAutomatedGrant(tx as unknown as TxParam, 'user-123', 'topic_post');

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
