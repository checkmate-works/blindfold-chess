import { SUPPORTED_LOCALES } from '@/config';

import { sanitizeNext } from './safe-next';

/**
 * Paths that must never become a post-auth return target.
 *
 * Returning to one of these after signing in either bounces the user straight
 * back out (the auth pages redirect an authenticated visitor away) or lands
 * them on a notice that no longer applies. The header's sign-in link is the
 * case that forces this list to exist: it renders on every page *including*
 * `/sign-in` itself, so without the filter it would build
 * `?next=/ja/sign-in` and turn the proxy's authenticated-visitor redirect
 * into a loop.
 *
 * Compared after the `/[locale]` prefix is stripped, so both the localized
 * (`/ja/sign-in`) and bare (`/sign-in`) forms are caught.
 */
const NON_RETURNABLE_PATHS: readonly string[] = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/banned',
];

function pathWithoutLocale(pathname: string): string {
  const segments = pathname.split('/');
  const first = segments[1];
  if (!first || !(SUPPORTED_LOCALES as readonly string[]).includes(first)) {
    return pathname;
  }
  const rest = segments.slice(2).join('/');
  return rest ? `/${rest}` : '/';
}

/**
 * The usable post-auth return target for `next`, or `null` when the caller
 * should fall back to its own default destination.
 *
 * Layers two independent checks: `sanitizeNext` rejects anything that could
 * escape the origin (the open-redirect guard), and {@link NON_RETURNABLE_PATHS}
 * rejects same-origin paths that are pointless or looping to return to. Every
 * producer *and* consumer of `?next=` goes through here, so an untrusted value
 * is re-validated on read even though it was validated on write.
 */
export function resolveReturnPath(next: string | null | undefined): string | null {
  const safe = sanitizeNext(next);
  if (!safe) return null;
  // `next` may carry a query and/or hash (`/leaderboard/score/all?page=3`);
  // the returnable check applies to the path alone.
  const [pathOnly] = safe.split(/[?#]/);
  if (NON_RETURNABLE_PATHS.includes(pathWithoutLocale(pathOnly))) return null;
  return safe;
}

/**
 * `base` with `?next=` appended when `next` is a usable return target,
 * otherwise `base` unchanged.
 *
 * Preserves any query `base` already carries (`/sign-in?toast=…`), so the
 * guards that redirect with a toast can add a return target without
 * hand-assembling the query string.
 */
export function withReturnPath(base: string, next: string | null | undefined): string {
  const safe = resolveReturnPath(next);
  if (!safe) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}next=${encodeURIComponent(safe)}`;
}
