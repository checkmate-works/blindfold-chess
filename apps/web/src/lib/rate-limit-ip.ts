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
} as const;
