import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';
import { timingSafeEqual } from 'node:crypto';

/**
 * Verify a Vercel Cron request's `Bearer ${CRON_SECRET}` header.
 *
 * Returns an error `NextResponse` when authentication fails, or `null` when
 * the request is authorized — callers do `if (authError) return authError;`.
 *
 * The compare is timing-safe so a remote attacker cannot brute-force the
 * secret one byte at a time. When `CRON_SECRET` is unset this returns 500
 * (not 401) so the misconfig is loud, rather than silently authenticating a
 * request whose header is the literal string `"Bearer undefined"`.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const a = Buffer.from(authHeader);
  const b = Buffer.from(`Bearer ${cronSecret}`);
  // timingSafeEqual throws on unequal-length inputs — short-circuit first.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

/**
 * Run a cron job body, funnelling any thrown error to `console.error` +
 * Sentry and a generic 500 JSON response. `label` prefixes the log line.
 */
export async function runCronJob(
  label: string,
  job: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await job();
  } catch (error) {
    console.error(`${label} failed:`, error instanceof Error ? error.message : 'Unknown error');
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
