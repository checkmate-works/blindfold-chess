import { hasLocale } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';

import { routing } from './routing';

/**
 * Narrow an untrusted locale candidate — a `[locale]` route segment, a
 * pathname slice, next-intl's `requestLocale` — to the `Locale` union,
 * falling back to the default.
 *
 * Every caller wants the same two things: a value the exhaustive
 * `Record<Locale, _>` maps (OG locales, `SITE_NAMES`, message imports) can be
 * indexed with, and no 500 when a URL carries something that is not a locale
 * at all. Five modules wrote the ternary out, and the three
 * `generateMetadata` copies each restated the reason in a comment of their
 * own.
 *
 * Not the same job as `assertSupportedLocale`, which throws and therefore
 * cannot serve a metadata function: Next.js runs `generateMetadata` before a
 * layout's `notFound()` can, so a stray `/fr/...` must degrade to the default
 * rather than fail. And unlike that module, this one reaches `routing`, whose
 * import chain pulls in `next/navigation` — so it belongs to React contexts
 * only.
 */
export function resolveLocale(candidate: string | undefined): Locale {
  return hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
}
