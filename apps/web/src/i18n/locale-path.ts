import { SUPPORTED_LOCALES } from '@/config';

/**
 * Top-level path segments served by route trees OUTSIDE `app/[locale]`.
 *
 * These must never receive a locale prefix — `/admin/users` is a real route,
 * `/en/admin/users` is not. Kept as an explicit allowlist because the proxy
 * runs on the Edge runtime and cannot enumerate the `app/` directory at
 * request time.
 *
 * `locale-path.test.ts` asserts this list stays in sync with the actual
 * route-producing directories under `src/app/`, so adding a new non-localized
 * namespace fails a test instead of silently breaking that namespace with a
 * redirect to `/<locale>/<namespace>`.
 *
 * `api` is also excluded by the proxy matcher in `proxy.ts`, so it is listed
 * here for completeness (and to keep the drift test honest) rather than
 * because the check would otherwise be reached.
 */
export const NON_LOCALE_TOP_SEGMENTS = ['admin', 'api', 'auth', 'g'] as const;

/**
 * Whether `pathname` is a locale-less in-app path that should be redirected to
 * its localized equivalent.
 *
 * ## Why this exists
 *
 * Every page under `app/[locale]` requires a locale prefix, and
 * `[locale]/layout.tsx` declares `dynamicParams = false`. A path whose first
 * segment is not a supported locale therefore binds `[locale]` to that
 * segment (`/games/new/standard` → `[locale] = 'games'`) and Next.js returns a
 * framework 404 before the page renders. Nothing in the app corrects for
 * this, which made every locale-less internal link a production 404 — see the
 * `locale` prop TSDoc on `CardLink` / `Breadcrumb` for the two components that
 * shipped exactly that bug. Completing the prefix here turns that class of
 * mistake into one extra redirect hop instead of an outage.
 *
 * It also recovers the URLs this app previously had to write off: paths
 * crawled before the `/[locale]` scheme existed (e.g. `/practice`) used to be
 * accepted 404s in Search Console, and now resolve.
 *
 * ## What is deliberately left alone
 *
 * - **`/`** — the landing page (`app/(landing)/page.tsx`) intentionally serves
 *   every language at the bare root and must not redirect. This is the reason
 *   next-intl's own middleware is not used: a blanket locale middleware would
 *   claim `/`, and excluding just `/` is the whole difference between "breaks
 *   the landing page" and "safe".
 * - **`NON_LOCALE_TOP_SEGMENTS`** — route trees that live outside
 *   `app/[locale]`.
 * - **Already-localized paths**, including a mis-cased locale (`/PT-BR/...`).
 *   Those keep 404ing exactly as before rather than redirecting to the
 *   nonsense target `/<locale>/PT-BR/...`; canonicalizing locale casing would
 *   be a separate feature, not a bug fix.
 * - **Root-level files served from `public/`**, detected by a `.` in the first
 *   segment. The proxy matcher already excludes the extensions this app
 *   actually ships as assets, but that list is an allowlist and misses
 *   anything added later — as it already does for
 *   `public/google<hash>.html`, the Google Search Console ownership-
 *   verification file, which would otherwise be redirected into a 404 and
 *   silently unverify the property. No supported locale contains a `.`, so
 *   this costs nothing.
 */
export function needsLocalePrefix(pathname: string): boolean {
  if (pathname === '/') return false;

  const first = pathname.split('/')[1];
  if (!first) return false;
  if (first.includes('.')) return false;

  const lower = first.toLowerCase();
  if (SUPPORTED_LOCALES.some((locale) => locale.toLowerCase() === lower)) return false;
  if ((NON_LOCALE_TOP_SEGMENTS as readonly string[]).includes(lower)) return false;

  return true;
}
