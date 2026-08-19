import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockSelectFromWhere = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: () => mockSelectFromWhere(),
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
  },
}));

const { checkIpRateLimitGuard, checkEmailRateLimitGuard, IP_RATE_LIMITS, EMAIL_RATE_LIMITS } =
  await import('./rate-limit-ip');

const config = { maxRequests: 3, windowMs: 60_000 };

describe('checkIpRateLimitGuard', () => {
  beforeEach(() => {
    mockInsertValues.mockResolvedValue(undefined);
  });

  it('returns null when under the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);
    expect(await checkIpRateLimitGuard('1.2.3.4', 'test', config)).toBeNull();
  });

  it('returns { error: rateLimited } when at the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 3 }]);
    expect(await checkIpRateLimitGuard('1.2.3.4', 'test', config)).toEqual({
      error: 'rateLimited',
    });
  });

  it('maps null IP to a shared "unknown" bucket so it cannot bypass rate limiting', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);
    await checkIpRateLimitGuard(null, 'test', config);
    expect(mockInsertValues).toHaveBeenCalledWith({
      subjectKey: 'ip:unknown',
      action: 'test',
    });
  });

  it('rate-limits null-IP callers once the shared bucket hits the cap', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 3 }]);
    expect(await checkIpRateLimitGuard(null, 'test', config)).toEqual({ error: 'rateLimited' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

describe('checkEmailRateLimitGuard', () => {
  // SHA-256 hex of "attacker@example.com" (lowercased, trimmed) for assertions.
  // Computed with: createHash('sha256').update('attacker@example.com').digest('hex')
  const expectedHashPrefix = 'email:';

  beforeEach(() => {
    mockInsertValues.mockResolvedValue(undefined);
  });

  it('returns null and inserts an event when under the limit', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);
    expect(await checkEmailRateLimitGuard('user@example.com', 'signIn', config)).toBeNull();
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    const [call] = mockInsertValues.mock.calls;
    const args = call[0] as { subjectKey: string; action: string };
    expect(args.action).toBe('signIn');
    expect(args.subjectKey.startsWith(expectedHashPrefix)).toBe(true);
    // SHA-256 hex is 64 chars → full key length 6 + 64 = 70.
    expect(args.subjectKey.length).toBe(expectedHashPrefix.length + 64);
  });

  it('returns { error: rateLimited } when at the limit (no insert)', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 3 }]);
    expect(await checkEmailRateLimitGuard('user@example.com', 'signIn', config)).toEqual({
      error: 'rateLimited',
    });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('normalises case and whitespace so "User@Example.com " and "user@example.com" share a bucket', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);
    await checkEmailRateLimitGuard('  User@Example.com  ', 'signIn', config);
    await checkEmailRateLimitGuard('user@example.com', 'signIn', config);
    const call1 = mockInsertValues.mock.calls[0][0] as { subjectKey: string };
    const call2 = mockInsertValues.mock.calls[1][0] as { subjectKey: string };
    expect(call1.subjectKey).toBe(call2.subjectKey);
  });

  it('produces distinct keys for distinct emails', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);
    await checkEmailRateLimitGuard('a@example.com', 'signIn', config);
    await checkEmailRateLimitGuard('b@example.com', 'signIn', config);
    const key1 = (mockInsertValues.mock.calls[0][0] as { subjectKey: string }).subjectKey;
    const key2 = (mockInsertValues.mock.calls[1][0] as { subjectKey: string }).subjectKey;
    expect(key1).not.toBe(key2);
  });

  it('does NOT embed the raw email in the subject key', async () => {
    mockSelectFromWhere.mockResolvedValue([{ count: 0 }]);
    await checkEmailRateLimitGuard('secret@example.com', 'signIn', config);
    const key = (mockInsertValues.mock.calls[0][0] as { subjectKey: string }).subjectKey;
    expect(key).not.toContain('secret@example.com');
    expect(key).not.toContain('@');
  });
});

describe('IP_RATE_LIMITS / EMAIL_RATE_LIMITS', () => {
  it('defines IP limits for all unauthenticated endpoints', () => {
    expect(IP_RATE_LIMITS.signIn).toEqual({ maxRequests: 10, windowMs: 300_000 });
    expect(IP_RATE_LIMITS.signUp).toEqual({ maxRequests: 5, windowMs: 300_000 });
    expect(IP_RATE_LIMITS.forgotPassword).toEqual({ maxRequests: 3, windowMs: 300_000 });
    expect(IP_RATE_LIMITS.resendEmail).toEqual({ maxRequests: 3, windowMs: 300_000 });
    expect(IP_RATE_LIMITS.resetPassword).toEqual({ maxRequests: 5, windowMs: 300_000 });
    expect(IP_RATE_LIMITS.contact).toEqual({ maxRequests: 3, windowMs: 60_000 });
  });

  it('defines email caps only for signIn and forgotPassword (NOT signUp — enumeration oracle)', () => {
    expect(EMAIL_RATE_LIMITS.signIn).toEqual({ maxRequests: 5, windowMs: 900_000 });
    expect(EMAIL_RATE_LIMITS.forgotPassword).toEqual({ maxRequests: 3, windowMs: 3_600_000 });
    expect('signUp' in EMAIL_RATE_LIMITS).toBe(false);
  });
});
