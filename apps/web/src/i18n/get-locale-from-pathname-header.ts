import { hasLocale } from 'next-intl';
import { headers } from 'next/headers';

import { routing } from './routing';

/**
 * Resolves the active `[locale]` segment from the `x-pathname` header (set by
 * `proxy.ts` on every request) rather than `getLocale()`.
 *
 * ## Only for boundaries on inherently-dynamic routes
 *
 * `headers()` is a dynamic API: one call inside a `loading.tsx` / skeleton
 * taints its whole route and silently disables static generation — a single
 * call inside `[locale]/not-found.tsx` once kept EVERY route in the tree out
 * of static generation. Use this helper only in Suspense/loading boundaries
 * of routes that are dynamic for independent reasons (auth reads,
 * `searchParams` pagination): the home feed, topics, chunks, practice result
 * pages. For boundaries on static/ISR routes, make the component a Client
 * Component (`useParams` + `useTranslations`) instead — see
 * `learn/[category]/[slug]/loading.tsx`. Pages themselves always have
 * `params` and never need this.
 *
 * ## Why not `getLocale()`
 *
 * `[locale]/layout.tsx` seeds the request locale via `setRequestLocale()`,
 * but the seed does not reach loading/not-found boundaries (verified against
 * the build: `getLocale()` there fell through to a `headers()` probe for the
 * `X-NEXT-INTL-LOCALE` header, which this app never sets — no next-intl
 * middleware — and then to `routing.defaultLocale`). In a boundary that
 * means an English skeleton flashing on a `ja` page; reading the
 * already-known pathname is race-free.
 */
export async function getLocaleFromPathnameHeader() {
  const pathname = (await headers()).get('x-pathname') ?? '';
  const candidate = pathname.split('/')[1];
  return hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
}
