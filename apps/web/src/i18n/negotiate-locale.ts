import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Picks the best supported locale for an `Accept-Language` header.
 *
 * Used by locale-less entry points — currently only the `/g/<code>` share
 * link, which has no `[locale]` segment to read. This is deliberately NOT
 * wired up as global middleware: the landing page serves at `/` for every
 * language and must not be redirected (see the note in `next.config.ts`).
 *
 * Matching is two-tier, most-preferred entry first: an exact tag match
 * (`pt-BR` → `pt-BR`) wins, otherwise the primary subtag matches a supported
 * locale that starts with it (`pt-PT` → `pt-BR`, `en-GB` → `en`). Quality
 * values are honoured, and `*` is ignored — a wildcard expresses no
 * preference, so it should fall through to the default rather than claim the
 * first supported locale.
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
    const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === tag);
    if (exact) return exact;

    const primary = tag.split('-')[0];
    const byPrimary = SUPPORTED_LOCALES.find(
      (locale) => locale.toLowerCase().split('-')[0] === primary
    );
    if (byPrimary) return byPrimary;
  }

  return DEFAULT_LOCALE;
}
