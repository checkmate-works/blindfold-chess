import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/config';

import { captureError } from '@/lib/sentry/capture-error';
import { buildLanguageAlternates } from '@/lib/seo/language-alternates';

export const BASE_URL = SITE_URL;

/**
 * Build one section of the sitemap, degrading to an empty section if its
 * query throws.
 *
 * Every section builder shares this policy: the sitemap is assembled from
 * roughly a dozen independent queries, and one failing table should cost
 * Google that table's URLs, not the whole document. Each builder used to
 * spell the policy out itself — the same try / `console.error` /
 * `captureException` / `return entries` block, eight times — which meant the
 * only thing keeping a new section from swallowing its error silently, or
 * from taking the sitemap down with it, was the author copying the previous
 * one correctly.
 *
 * @param label - Describes the section, used as the log context
 *   (e.g. `'Error fetching announcements for sitemap'`).
 */
export async function buildSitemapSection(
  label: string,
  build: () => Promise<MetadataRoute.Sitemap>
): Promise<MetadataRoute.Sitemap> {
  try {
    return await build();
  } catch (error) {
    captureError(error, label);
    return [];
  }
}

/**
 * Generate the `alternates.languages` entry for a sitemap row — one
 * fully-qualified URL per locale in `SUPPORTED_LOCALES` (or per locale in
 * `availableLocales` when provided), plus an `x-default` entry pointing at
 * the English version.
 *
 * This is the sitemap counterpart of `generateCanonicalMetadata`'s
 * `alternates.languages` map (defined in `app/[locale]/_lib/metadata.ts`).
 * Both must emit the same set of locales so that Google sees consistent
 * bidirectional hreflang signals across the sitemap and the page-level
 * `<link rel="alternate" hreflang>` tags. Because both iterate the same
 * `SUPPORTED_LOCALES` array by default, adding a locale keeps them in sync
 * automatically — there is no manual duplication to update.
 *
 * The `availableLocales` override mirrors the same-named argument on
 * `generateCanonicalMetadata`: for partially-translated resources (e.g. an
 * article that exists only in en/ja), pass the subset of locales that have
 * content so the sitemap only lists alternates that actually resolve.
 * Omitting the argument defaults to the full `SUPPORTED_LOCALES` list, which
 * is correct for pages that exist in every locale.
 */
export function generateAlternates(path: string, availableLocales?: readonly string[]) {
  return {
    languages: buildLanguageAlternates(
      (locale) => `${BASE_URL}/${locale}${path}`,
      availableLocales
    ),
  };
}
