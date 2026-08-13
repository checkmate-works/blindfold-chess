import { headers } from 'next/headers';

import { returnTargetFor } from './auth-return-path';

/**
 * The URL currently being rendered, shaped as a post-auth return target.
 *
 * A Server Component has no access to its own URL — layouts receive only
 * their own segment's params, and `redirect()` takes an absolute destination.
 * The proxy forwards the pieces as `x-pathname` / `x-search` (see `proxy.ts`),
 * which is what lets a server-side auth guard say *where* the user was going.
 *
 * Returns `null` when those headers are absent — the proxy matcher excludes
 * `/api/*`, and unit tests render without it — so callers fall back to their
 * plain sign-in destination rather than to a fabricated one.
 *
 * Only call this from code that is already dynamic. Reading `headers()` opts
 * a route out of static rendering (see "No dynamic-API reads" in
 * `apps/web/CLAUDE.md`); every current caller is an auth guard that has
 * already read cookies to resolve the session.
 */
export async function getCurrentReturnTarget(): Promise<string | null> {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-pathname');
  if (!pathname) return null;
  return returnTargetFor(pathname, requestHeaders.get('x-search') ?? '');
}
