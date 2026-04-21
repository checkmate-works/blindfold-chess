import { SUPPORTED_LOCALES } from '@/config';

import { getLocaleFromRequest } from '@/lib/locale';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Landing-page locale resolver.
 *
 * Priority: `?lang=` query param > cookie > Accept-Language > default (en).
 *
 * The root landing page lives at `/` across all languages (product
 * requirement) and therefore cannot participate in path-based i18n the way
 * `/[locale]` does. That leaves two options for getting localized content
 * indexed: Accept-Language sniffing (invisible to Googlebot, which does not
 * send Accept-Language from its US crawl) or URL-scoped query variants.
 * We use the latter: `/?lang=ja`, `/?lang=es`, `/?lang=pt-BR` are distinct,
 * crawlable URLs that Google treats as independent pages and links together
 * via hreflang. This resolver ensures the query param wins over both the
 * cookie and the Accept-Language header so that a crawl from the US still
 * produces a Japanese page for `/?lang=ja`.
 *
 * Unsupported values (e.g. `?lang=fr`, `?lang=<script>`) are ignored and
 * fall through to the standard cookie/Accept-Language/default cascade — the
 * whitelist on `SUPPORTED_LOCALES` is what makes this safe to trust.
 *
 * The query param is intentionally URL-only: we do NOT write it to the
 * locale cookie. Persisting it would make Googlebot's probe of
 * `/?lang=ja` "stick" for subsequent unparameterized fetches, fragmenting
 * the crawl signal and making debugging harder. Explicit language choices
 * (e.g. via `LanguageSelector`) continue to write the cookie as before.
 */
export async function getLandingLocale(
  searchParams: Record<string, string | string[] | undefined>
): Promise<Locale> {
  const raw = searchParams.lang;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (candidate && (SUPPORTED_LOCALES as readonly string[]).includes(candidate)) {
    return candidate as Locale;
  }
  return getLocaleFromRequest();
}
