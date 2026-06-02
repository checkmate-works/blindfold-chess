/**
 * Key-based rate limiting — PostgreSQL fixed-window counter.
 *
 * @description
 * Provides a database-backed rate limiter for unauthenticated endpoints that
 * cannot key on a user UUID (sign-in, sign-up, password reset, email resend,
 * contact form). Events are recorded in `rate_limit_key_events` and counted
 * per (subjectKey, action) pair within the configured time window.
 *
 * Two key namespaces are used:
 *   - `ip:<ip>`       — keyed on the client IP (see `getClientIp`).
 *   - `email:<sha256>` — keyed on `SHA-256(email.toLowerCase().trim())`, used
 *                        as a secondary per-account ceiling so an attacker
 *                        distributing across many IPs still hits a limit.
 *
 * @design Shared storage, cross-instance
 *
 * The previous implementation used a module-scope `Map`, which was per-Vercel-
 * instance and cleared on cold start — effectively ornamental. Persisting
 * events in Postgres gives cross-instance, cold-start-durable accounting that
 * matches the `rate_limit_events` (user-keyed) limiter.
 *
 * @design Parallel table to rate_limit_events
 *
 * `rate_limit_events.user_id` is `uuid NOT NULL` with a FK to `auth.users`,
 * so it cannot hold free-form keys like `ip:1.2.3.4`. A separate table
 * (`rate_limit_key_events`) avoids widening the existing schema and keeps
 * the user-keyed limiter untouched.
 */
import { and, count, eq, gt, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import 'server-only';

import { db, rateLimitKeyEvents } from '../db';
import { getClientIp } from './client-ip';

export type IpRateLimitConfig = { maxRequests: number; windowMs: number };

export const IP_RATE_LIMITS = {
  signIn: { maxRequests: 10, windowMs: 300_000 }, // 5 min, 10 requests
  signUp: { maxRequests: 5, windowMs: 300_000 }, // 5 min, 5 requests
  forgotPassword: { maxRequests: 3, windowMs: 300_000 }, // 5 min, 3 requests
  resendEmail: { maxRequests: 3, windowMs: 300_000 }, // 5 min, 3 requests
  resetPassword: { maxRequests: 5, windowMs: 300_000 }, // 5 min, 5 requests
  contact: { maxRequests: 3, windowMs: 60_000 }, // 1 min, 3 requests
  // Publishing a shared game is open to account-less authors, so it gates on
  // IP rather than user id. 5 / 10 min is generous for a human sharing a game
  // but caps scripted spam from a single source.
  publishGame: { maxRequests: 5, windowMs: 600_000 }, // 10 min, 5 requests
} as const;

/**
 * Secondary per-account rate limits keyed by `SHA-256(email)`.
 *
 * Applied in addition to the IP limit for flows where the submitted email is
 * the attacker's effective target (sign-in, password reset). Tighter than the
 * IP limits on purpose: an attacker rotating IPs still hits these.
 *
 * NOT applied to sign-up (would create an email-enumeration oracle: the
 * attacker could learn whether an email has already been used by whether it
 * trips the limit faster than expected).
 */
export const EMAIL_RATE_LIMITS = {
  signIn: { maxRequests: 5, windowMs: 900_000 }, // 15 min, 5 attempts per email
  forgotPassword: { maxRequests: 3, windowMs: 3_600_000 }, // 1 hour, 3 per email
} as const;

function windowStartSql(windowMs: number) {
  return sql`now() - ${windowMs / 1000.0}::double precision * interval '1 second'`;
}

async function countEventsInWindow(
  subjectKey: string,
  action: string,
  windowMs: number
): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(rateLimitKeyEvents)
    .where(
      and(
        eq(rateLimitKeyEvents.subjectKey, subjectKey),
        eq(rateLimitKeyEvents.action, action),
        gt(rateLimitKeyEvents.createdAt, windowStartSql(windowMs))
      )
    );

  return result.count;
}

/**
 * Check whether a given subject key for the given action is under the limit.
 *
 * If under the limit, a new event is inserted and `{ allowed: true }` returned.
 * If at or over the limit, NO event is inserted and `{ allowed: false }` is
 * returned.
 */
async function checkKeyRateLimit(
  subjectKey: string,
  action: string,
  config: IpRateLimitConfig
): Promise<{ allowed: boolean }> {
  const current = await countEventsInWindow(subjectKey, action, config.windowMs);
  if (current >= config.maxRequests) {
    return { allowed: false };
  }

  await db.insert(rateLimitKeyEvents).values({ subjectKey, action });
  return { allowed: true };
}

/**
 * IP-based rate limit guard for Server Actions (unauthenticated endpoints).
 *
 * Returns `{ error: 'rateLimited' }` if the limit is exceeded, or `null` if
 * the request is allowed (and an event has been recorded).
 *
 * @param ip - The client IP address (from `getClientIp()`), or `null` if
 *   unavailable. A `null` IP is mapped to a shared `unknown` bucket so that
 *   rate limiting cannot be bypassed by spoofing malformed headers that make
 *   IP extraction fail.
 * @param action - The action key for the rate limiter (e.g. `'signIn'`).
 * @param config - The IP rate limit configuration.
 */
export async function checkIpRateLimitGuard(
  ip: string | null,
  action: string,
  config: IpRateLimitConfig
): Promise<{ error: 'rateLimited' } | null> {
  const effectiveIp = ip ?? 'unknown';
  const { allowed } = await checkKeyRateLimit(`ip:${effectiveIp}`, action, config);
  if (!allowed) {
    return { error: 'rateLimited' };
  }
  return null;
}

/**
 * Hash an email for use as a rate-limit key. Lowercased + trimmed first to
 * normalise trivial casing / whitespace differences; SHA-256 to avoid storing
 * the raw email as the limiter key (the limiter table is server-side only,
 * but hashing also prevents accidental leakage via logs / backups).
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * Email-based rate limit guard for Server Actions (unauthenticated endpoints).
 *
 * Secondary cap that applies *in addition to* the IP guard. An attacker
 * distributing a password-spray attack across thousands of IPs would still
 * hit this per-account ceiling.
 *
 * @param email - The submitted email address. Callers should pass the raw
 *   input; normalisation (lowercase + trim + hash) happens here.
 * @param action - The action key for the rate limiter (e.g. `'signIn'`).
 * @param config - The email rate limit configuration.
 */
export async function checkEmailRateLimitGuard(
  email: string,
  action: string,
  config: IpRateLimitConfig
): Promise<{ error: 'rateLimited' } | null> {
  const hashed = hashEmail(email);
  const { allowed } = await checkKeyRateLimit(`email:${hashed}`, action, config);
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
