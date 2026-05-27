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

const { calcGrantStartsAt } = await import('./user-grants');

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
