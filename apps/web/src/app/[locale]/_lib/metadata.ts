import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DEFAULT_LOCALE, SITE_URL } from '@/config';

import { buildLanguageAlternates } from '@/lib/seo/language-alternates';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Keyword map for determining title suffix by locale.
 * - `seoSiteName`: the SEO-focused site name that also serves as the keyword
 *   to detect in a page title.
 * - `siteName`: the brand name used as suffix when the keyword is already
 *   present in the title (to avoid redundant stuffing).
 *
 * Exhaustiveness: typed as `Record<Locale, _>` mirroring `LANGUAGE_TAGS`
 * (`src/i18n/language-tags.ts`) and `OG_LOCALE_MAP` (`src/i18n/og-locale.ts`),
 * so adding a new entry to `SUPPORTED_LOCALES` without updating this map is a
 * compile-time error. This compile-time guarantee is still the primary line
 * of defence against a silently-missing locale entry.
 *
 * Runtime fallback: the lookup sites below (`buildPageTitle`, `resolveTitle`)
 * narrow via `?? SITE_NAMES[DEFAULT_LOCALE]` because the Next.js App Router
 * invokes `generateMetadata` with the URL-supplied `[locale]` segment *before*
 * any layout-level `notFound()` has a chance to run. Without the fallback, a
 * URL like `/fr/...` (or the bare `/pt/...` that triggered the incident this
 * comment documents) throws a `Cannot read properties of undefined` deep
 * inside metadata generation and turns a would-be 404 into a 500. The
 * fallback only affects URL-supplied values outside `SUPPORTED_LOCALES`;
 * legitimate compile-time additions to the type must still extend this map
 * or TypeScript will fail the build.
 */
const SITE_NAMES: Record<Locale, { seoSiteName: string; siteName: string }> = {
  en: { seoSiteName: 'Blindfold Chess', siteName: 'Shingan Chess' },
  ja: { seoSiteName: '目隠しチェス', siteName: '心眼チェス' },
  es: { seoSiteName: 'Ajedrez a Ciegas', siteName: 'Shingan Chess' },
  'pt-BR': { seoSiteName: 'Xadrez às Cegas', siteName: 'Shingan Chess' },
};

/**
 * Build a full page title with the appropriate suffix.
 * If the title already contains the SEO site name (e.g., "Blindfold Chess"),
 * uses the brand name (e.g., "Shingan Chess") as suffix to avoid redundancy.
 * Otherwise uses the SEO site name as suffix for SEO value.
 *
 * @returns Full title string with suffix (e.g., "Learn | Blindfold Chess")
 */
export function buildPageTitle(title: string, locale: Locale): string {
  const { seoSiteName, siteName } = SITE_NAMES[locale] ?? SITE_NAMES[DEFAULT_LOCALE];
  if (title.includes(seoSiteName)) {
    return `${title} | ${siteName}`;
  }
  return `${title} | ${seoSiteName}`;
}

/**
 * Resolve a page title for use with Next.js metadata.
 * Works with the root layout's `title.template: '%s | ${seoSiteName}'`.
 *
 * - If the title contains the SEO site name phrase, returns `{ absolute: '...' }`
 *   to bypass the template and use the brand name as suffix instead.
 * - Otherwise returns the plain title string, letting the template add the suffix.
 *
 * @returns Plain string (uses template) or `{ absolute: string }` (bypasses template)
 */
export function resolveTitle(title: string, locale: Locale): string | { absolute: string } {
  const { seoSiteName, siteName } = SITE_NAMES[locale] ?? SITE_NAMES[DEFAULT_LOCALE];
  if (title.includes(seoSiteName)) {
    return { absolute: `${title} | ${siteName}` };
  }
  return title;
}

/**
 * Emit canonical URL, hreflang `alternates.languages`, and openGraph URL /
 * title / description metadata for a page. This is the central hreflang
 * machinery used by every non-sitemap page in the app.
 *
 * Contract:
 * 1. **Canonical URL**: `<SITE_URL>/<effectiveLocale>/<path>` where
 *    `effectiveLocale` is `canonicalLocale ?? locale`. The canonical tells
 *    Google which URL is the authoritative version of this page; pointing it
 *    at a different locale is the "fallback content" signal used when a
 *    translation is unavailable and we are serving the source-language page.
 * 2. **`alternates.languages`**: one entry per locale in `SUPPORTED_LOCALES`
 *    (or `availableLocales` when provided) plus an `x-default` entry. Each
 *    entry is a fully-qualified URL pointing at that locale's version of the
 *    same path. This satisfies Google's **bidirectional hreflang
 *    requirement**: every page lists itself and all its alternates, and every
 *    alternate must list us back — because all pages run through this helper
 *    and iterate the same locale list, self-referencing is automatic.
 * 3. **`x-default`**: always points at the English version. `x-default` is
 *    the fallback Google shows when no hreflang entry matches the user's
 *    language / region, and English is the project's source language.
 * 4. **`availableLocales` override**: for partially-translated pages (e.g.
 *    articles that exist in a subset of locales), pass the subset here to
 *    emit hreflang only for locales where the page actually exists. Omitting
 *    this argument defaults to the full `SUPPORTED_LOCALES` list, which is
 *    correct for pages that are translated for every locale.
 *
 * Keep in sync with `generateAlternates` in `app/_lib/sitemap/shared.ts`,
 * which is the sitemap counterpart of this function's `languages` map. Both
 * iterate `SUPPORTED_LOCALES`, so adding a locale fans out to both surfaces
 * without any manual synchronization.
 *
 * @param locale - Current locale (e.g., 'en', 'pt-BR', 'ja')
 * @param path - Path without locale prefix (e.g., '/learn', '/practice/algebraic-notation')
 * @param title - Optional page title for openGraph
 * @param description - Optional page description for openGraph
 * @param availableLocales - When provided, only emit hreflang for these locales (e.g., for articles that exist in limited locales)
 * @param canonicalLocale - Override locale for canonical URL (e.g., when serving fallback content from a different locale)
 */
export function generateCanonicalMetadata({
  locale,
  path,
  title,
  description,
  availableLocales,
  canonicalLocale,
}: {
  locale: Locale;
  path: string;
  title?: string;
  description?: string;
  availableLocales?: Locale[];
  canonicalLocale?: Locale;
}): Metadata {
  const baseUrl = SITE_URL;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  const effectiveLocale = canonicalLocale ?? locale;
  const canonical = `${baseUrl}/${effectiveLocale}${cleanPath ? `/${cleanPath}` : ''}`;

  const languages = buildLanguageAlternates(
    (loc) => `${baseUrl}/${loc}${cleanPath ? `/${cleanPath}` : ''}`,
    availableLocales
  );

  return {
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      url: canonical,
      ...(title && { title: buildPageTitle(title, effectiveLocale) }),
      ...(description && { description }),
    },
  };
}

/**
 * Build `Metadata` for a static page whose title and description come from
 * an `i18n` namespace's `title` / `description` keys.
 *
 * Replaces the recurring 8-line boilerplate that every static page used to
 * inline inside its own `generateMetadata`:
 *
 *   const { locale } = await params;
 *   const t = await getTranslations({ locale, namespace });
 *   const title = t('title');
 *   const description = t('description');
 *   return {
 *     ...generateCanonicalMetadata({ locale, path, title, description }),
 *     title: resolveTitle(title, locale),
 *     description,
 *   };
 *
 * For dynamic-route pages whose title comes from a DB record, or for pages
 * that need to short-circuit on `notFound()` before metadata is computed,
 * keep using `generateCanonicalMetadata` + `resolveTitle` directly — those
 * cases don't fit a single-namespace shape.
 *
 * @param params - The `params` promise from the Next.js page props
 * @param namespace - `next-intl` namespace exposing the title / description keys
 * @param path - Path without locale prefix (e.g. `'topics'`, `'pricing'`)
 * @param titleKey - Translation key for the title within `namespace` (default `'title'`)
 * @param descriptionKey - Translation key for the description within `namespace` (default `'description'`)
 * @param availableLocales - Pass when the page is translated for a subset of locales
 *
 * The title/description keys must be plain keys with no interpolation values —
 * pages whose title needs `t('title', { ... })`, whose copy comes from a DB
 * record, or that short-circuit on `notFound()` before metadata is computed
 * should keep using `generateCanonicalMetadata` + `resolveTitle` directly.
 */
export async function createPageMetadata({
  params,
  namespace,
  path,
  titleKey = 'title',
  descriptionKey = 'description',
  availableLocales,
  noIndex = false,
  omitDescription = false,
}: {
  params: Promise<{ locale: Locale }>;
  namespace: string;
  path: string;
  /** Translation key for the title (default `'title'`). */
  titleKey?: string;
  /** Translation key for the description (default `'description'`). */
  descriptionKey?: string;
  availableLocales?: Locale[];
  /**
   * Emit `robots: { index: false, follow: false }`. Use for pages that should
   * not appear in search engines (auth flows, account screens, members-only
   * surfaces).
   */
  noIndex?: boolean;
  /**
   * Skip reading and emitting `description`. Use for pages whose i18n
   * namespace defines `title` only.
   */
  omitDescription?: boolean;
}): Promise<Metadata> {
  const { locale } = await params;
  // Idempotent; safe to call even when the page component also calls it.
  // Centralising it here lets per-page `generateMetadata` shed the line.
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace });
  const title = t(titleKey);
  const description = omitDescription ? undefined : t(descriptionKey);
  return {
    ...generateCanonicalMetadata({ locale, path, title, description, availableLocales }),
    title: resolveTitle(title, locale),
    ...(description !== undefined && { description }),
    ...(noIndex && { robots: { index: false, follow: false } }),
  };
}
