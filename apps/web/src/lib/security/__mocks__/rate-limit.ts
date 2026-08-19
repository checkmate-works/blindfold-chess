import { vi } from 'vitest';

const actual = await vi.importActual<typeof import('../rate-limit')>('../rate-limit');

/**
 * Rate limiting, always allowed.
 *
 * Opt in with a bare `vi.mock('@/lib/security/rate-limit')`. Forty-three tests
 * had to silence the limiter, and each wrote its own factory — which meant each
 * also had to hand-copy the entry of `RATE_LIMITS` its subject reads. Three of
 * those copies had drifted from the real config (`savePracticeResult` was
 * written as 10 attempts per minute against a real 60 per hour, with the
 * `action` key missing), so a test could assert the limiter was called with a
 * budget the production code never uses.
 *
 * Everything except the two async checks is re-exported from the real module,
 * so the configs a test asserts against are the configs that ship. Override the
 * verdict per test with `vi.mocked(checkRateLimit).mockResolvedValue(...)`.
 */
export const RATE_LIMITS = actual.RATE_LIMITS;
export const AI_REVIEW_GENERATIONS_PER_DAY = actual.AI_REVIEW_GENERATIONS_PER_DAY;
export const createOpeningPostRateLimit = actual.createOpeningPostRateLimit;

export const checkRateLimit = vi.fn(
  async (): Promise<{ success: true } | { error: 'rateLimited' }> => ({ success: true })
);
export const isRateLimited = vi.fn(async () => false);
