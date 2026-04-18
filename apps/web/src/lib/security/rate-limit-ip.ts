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
 * 制限事項:
 * - インメモリ（Map）ベースのため、マルチインスタンス環境ではインスタンス間で
 *   レートリミットの状態が共有されない。
 * - Serverless 環境（Vercel Functions 等）ではコールドスタートごとにストアが
 *   リセットされるため、制限の精度が低下する。
 * - DB ベースのレートリミット（rate-limit.ts）との二重防御により、
 *   上記制限の影響を緩和している。
 *
 * TODO: トラフィック増加時には Redis（Upstash 等）ベースの実装に移行し、
 * インスタンス間で状態を共有できるようにする。
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
