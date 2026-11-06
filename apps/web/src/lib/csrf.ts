import * as Sentry from '@sentry/nextjs';
import 'server-only';

/**
 * Pure core of the check: do two origins refer to the same site?
 *
 * Split out so the normalization rule (a trailing slash on either side is
 * insignificant) can be exercised without stubbing the environment — the
 * suite for {@link isValidOrigin} has to `vi.stubEnv` for nearly every case,
 * and one of them deletes the variable off `process.env` outright.
 */
export function originMatches(origin: string, allowedOrigin: string): boolean {
  return origin.replace(/\/+$/, '') === allowedOrigin.replace(/\/+$/, '');
}

/**
 * Validate that the request Origin header matches `NEXT_PUBLIC_SITE_URL`.
 *
 * Next.js Server Actions include built-in CSRF protection via Origin header
 * validation, but API Routes (route.ts) do not. This utility provides the
 * same defense for API Routes as a defense-in-depth measure.
 *
 * Fails closed: a request with no `Origin` header, or a deployment with
 * `NEXT_PUBLIC_SITE_URL` unset, returns `false`. The unset variable and an
 * origin mismatch are also reported to Sentry as warnings; a missing header
 * is not.
 */
export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }

  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!allowedOrigin) {
    Sentry.captureMessage('CSRF check failed: NEXT_PUBLIC_SITE_URL is not configured', 'warning');
    return false;
  }

  if (!originMatches(origin, allowedOrigin)) {
    Sentry.captureMessage(`CSRF origin mismatch: received ${origin}`, 'warning');
    return false;
  }

  return true;
}
