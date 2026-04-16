import * as Sentry from '@sentry/nextjs';
import 'server-only';

/**
 * Validate that the request Origin header matches the expected origin.
 * Returns true if the origin is valid, false otherwise.
 *
 * @description
 * Next.js Server Actions include built-in CSRF protection via Origin header
 * validation, but API Routes (route.ts) do not. This utility provides the
 * same defense for API Routes as a defense-in-depth measure.
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

  if (origin.replace(/\/+$/, '') !== allowedOrigin.replace(/\/+$/, '')) {
    Sentry.captureMessage(`CSRF origin mismatch: received ${origin}`, 'warning');
    return false;
  }

  return true;
}
