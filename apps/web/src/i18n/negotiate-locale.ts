import { DEFAULT_LOCALE } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

import { matchLanguageTag } from './supported-locale';

/**
 * Picks the best supported locale for an `Accept-Language` header.
 *
 * Used by locale-less entry points: the `/g/<code>` share link, which has no
 * `[locale]` segment to read, and the proxy's locale-prefix completion (see
 * `needsLocalePrefix()` in `./locale-path.ts`). next-intl's own middleware is
 * still not used, because it would claim the bare `/` that the landing page
 * serves for every language.
 *
 * Each entry is resolved with `matchLanguageTag()` (exact tag first, then
 * primary subtag), most-preferred entry first. Quality values are honoured,
 * and `*` is ignored — a wildcard expresses no preference, so it should fall
 * through to the default rather than claim the first supported locale.
 *
 * This is the app's only `Accept-Language` parser. `getLocaleFromRequest()`
 * in `@/lib/locale` delegates here for its header step, so the landing page
 * and `/g/<code>` cannot disagree about the same visitor.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const requested = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      const quality = q ? Number.parseFloat(q.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag !== '' && entry.tag !== '*' && entry.quality > 0)
    // Stable sort keeps header order among equal q-values, which is what the
    // spec says equal-weight entries mean.
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of requested) {
    const matched = matchLanguageTag(tag);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}
