import { headers } from 'next/headers';

/**
 * Extract the client IP address from request headers.
 *
 * Returns the best-available approximation of the true client IP, preferring
 * headers that are set by Vercel's edge (and therefore cannot be spoofed by
 * the client) over the raw `X-Forwarded-For` chain (which a caller controls).
 *
 * Preference order (first match wins):
 *
 *   1. `x-real-ip`               — Vercel sets this to the true client IP.
 *   2. `x-vercel-forwarded-for`  — Vercel-appended / sanitised proxy chain
 *                                  (first entry is the real client IP).
 *   3. `x-forwarded-for`         — RFC 7239 proxy chain. Vercel APPENDS the
 *                                  true client IP at the END; any entries
 *                                  ahead of it were supplied by the caller
 *                                  and MUST NOT be trusted. We therefore
 *                                  take the LAST entry, not the first.
 *   4. `null`                    — Local dev / no proxy in front of us.
 *
 * Rationale: on Vercel (and most reverse-proxy setups) the client can
 * pre-populate `X-Forwarded-For` with arbitrary values before the request
 * reaches the proxy. Reading `.split(',')[0]` returns the attacker-supplied
 * value and makes any IP-keyed rate limit trivially bypassable.
 *
 * See: https://vercel.com/docs/edge-network/headers/request-headers#x-forwarded-for
 */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();

  const realIp = headersList.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const vercelForwarded = headersList.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    const first = vercelForwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    // Take the LAST entry — the hop closest to our server, which on Vercel
    // is the true client IP. Earlier entries may be attacker-supplied.
    const parts = forwarded.split(',');
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i]?.trim();
      if (candidate) return candidate;
    }
  }

  return null;
}
