import { getClientIp } from './client-ip';

export type IpRateLimitConfig = { maxRequests: number; windowMs: number };

type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/** Visible for testing only. */
export function _resetStore() {
  store.clear();
}

/**
 * Check whether a request from the given IP for the given action is allowed
 * under the specified rate limit configuration.
 *
 * Uses an in-memory fixed-window approach keyed by `${ip}:${action}`.
 *
 * Limitations:
 * - Because the store is an in-memory `Map`, rate-limit state is not shared
 *   across instances in a multi-instance deployment.
 * - In serverless environments (Vercel Functions, etc.) the store is reset on
 *   every cold start, which reduces the accuracy of the limit.
 * - These limitations are mitigated by a second layer of DB-based rate
 *   limiting (rate-limit.ts) running alongside this one.
 *
 * TODO: As traffic grows, migrate to a Redis-backed implementation (e.g.,
 * Upstash) so that rate-limit state can be shared across instances.
 */
export function checkIpRateLimit(
  ip: string,
  action: string,
  config: IpRateLimitConfig
): { allowed: boolean } {
  cleanup();

  const now = Date.now();
  const key = `${ip}:${action}`;
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count < config.maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  return { allowed: false };
}

export const IP_RATE_LIMITS = {
  signIn: { maxRequests: 10, windowMs: 300_000 }, // 5 min, 10 requests
  signUp: { maxRequests: 5, windowMs: 300_000 }, // 5 min, 5 requests
  forgotPassword: { maxRequests: 3, windowMs: 300_000 }, // 5 min, 3 requests
  resendEmail: { maxRequests: 3, windowMs: 300_000 }, // 5 min, 3 requests
  resetPassword: { maxRequests: 5, windowMs: 300_000 }, // 5 min, 5 requests
} as const;

/**
 * IP-based rate limit guard for Server Actions (unauthenticated endpoints).
 *
 * Resolves the client IP and checks the in-memory rate limiter.
 * Returns `{ error: 'rateLimited' }` if the limit is exceeded, or `null` if allowed.
 *
 * @param ip - The client IP address (from `getClientIp()`), or `null` if unavailable.
 * @param key - The action key for the rate limiter (e.g., `'signIn'`).
 * @param config - The IP rate limit configuration.
 */
export function checkIpRateLimitGuard(
  ip: string | null,
  key: string,
  config: IpRateLimitConfig
): { error: 'rateLimited' } | null {
  // Use a shared bucket for null IPs so they cannot bypass rate limiting.
  const effectiveIp = ip ?? 'unknown';
  const { allowed } = checkIpRateLimit(effectiveIp, key, config);
  if (!allowed) {
    return { error: 'rateLimited' };
  }
  return null;
}

/**
 * IP-based rate-limit guard for unauthenticated Server Actions, resolving the
 * client IP and the action's configured limit in one call.
 *
 * Returns `{ error: 'rateLimited' }` when the limit is exceeded, or `null`
 * when the request is allowed. This is the unauthenticated counterpart to
 * `authenticateAndGuard` (which keys on the user id): the pre-auth flows —
 * sign-up, sign-in, password reset — all gate on IP instead, and previously
 * each repeated the `getClientIp()` + `checkIpRateLimitGuard()` pair inline.
 *
 * @param action - Key into `IP_RATE_LIMITS`; also the rate-limiter bucket key.
 */
export async function guardByIpRateLimit(
  action: keyof typeof IP_RATE_LIMITS
): Promise<{ error: 'rateLimited' } | null> {
  const ip = await getClientIp();
  return checkIpRateLimitGuard(ip, action, IP_RATE_LIMITS[action]);
}
