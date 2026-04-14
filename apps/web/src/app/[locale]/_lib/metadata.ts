import type { Metadata } from 'next';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

/**
 * Keyword map for determining title suffix by locale.
 * - seoSiteName: the SEO-focused site name that also serves as the keyword to detect
 * - siteName: the brand name used as suffix when keyword is already present in title
 */
const SITE_NAMES: Record<string, { seoSiteName: string; siteName: string }> = {
  en: { seoSiteName: 'Blindfold Chess', siteName: 'Shingan Chess' },
  ja: { seoSiteName: '目隠しチェス', siteName: '心眼チェス' },
};

function getSiteNames(locale: string) {
  return SITE_NAMES[locale] ?? SITE_NAMES['en'];
}

/**
 * Build a full page title with the appropriate suffix.
 * If the title already contains the SEO site name (e.g., "Blindfold Chess"),
 * uses the brand name (e.g., "Shingan Chess") as suffix to avoid redundancy.
 * Otherwise uses the SEO site name as suffix for SEO value.
 *
 * @returns Full title string with suffix (e.g., "Learn | Blindfold Chess")
 */
export function buildPageTitle(title: string, locale: string): string {
  const { seoSiteName, siteName } = getSiteNames(locale);
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
export function resolveTitle(title: string, locale: string): string | { absolute: string } {
  const { seoSiteName, siteName } = getSiteNames(locale);
  if (title.includes(seoSiteName)) {
    return { absolute: `${title} | ${siteName}` };
  }
  return title;
}

/**
 * Generate canonical URL, alternates, and openGraph metadata for a page.
 * @param locale - Current locale (e.g., 'en', 'ja')
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
  locale: string;
  path: string;
  title?: string;
  description?: string;
  availableLocales?: string[];
  canonicalLocale?: string;
}): Metadata {
  const baseUrl = SITE_URL;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  const effectiveLocale = canonicalLocale ?? locale;
  const canonical = `${baseUrl}/${effectiveLocale}${cleanPath ? `/${cleanPath}` : ''}`;

  // Build hreflang entries
  const languages: Record<string, string> = {};
  const localesForAlternates = availableLocales ?? [...SUPPORTED_LOCALES];
  for (const loc of localesForAlternates) {
    languages[loc] = `${baseUrl}/${loc}${cleanPath ? `/${cleanPath}` : ''}`;
  }
  languages['x-default'] = `${baseUrl}/en${cleanPath ? `/${cleanPath}` : ''}`;

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
