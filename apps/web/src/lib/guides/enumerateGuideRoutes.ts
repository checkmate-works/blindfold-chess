import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import type { GuidePathTarget } from './buildGuidePath';
import { getRankGuide } from './guideData';

/**
 * One reachable URL under `/[locale]/dojo/guides/...`, described in
 * locale-agnostic terms. Derived from {@link GuidePathTarget} plus a `slug`
 * field — so any change to the set of valid `kind` values automatically
 * propagates to the enumerator (TypeScript catches missing cases in
 * `guideRouteToSegments`).
 */
export type GuideRoutePath = GuidePathTarget & { slug: RankSlug };

/**
 * Enumerate every distinct route under `/dojo/guides/...` that exists for
 * the given `guides.pages` data. Locale-agnostic: callers layer
 * `SUPPORTED_LOCALES` on top for `generateStaticParams` or sitemap generation.
 *
 * Ranks with no entry in `guidesPages` (or an invalid entry) are skipped,
 * so `generateStaticParams` callers never pre-render pages that would
 * resolve to `notFound()` at runtime.
 */
export function enumerateGuideRoutes(guidesPages: Record<string, unknown>): GuideRoutePath[] {
  const routes: GuideRoutePath[] = [];

  for (const slug of ALL_RANK_SLUGS) {
    const guide = getRankGuide(guidesPages, slug);
    if (!guide) continue;

    // Rank root exists for both formats (flat page 1 or chapter list).
    routes.push({ slug, kind: 'root' });

    if (guide.format === 'flat') {
      for (let page = 2; page <= guide.pages.length; page++) {
        routes.push({ slug, kind: 'flat-page', page });
      }
    } else {
      for (const chapter of guide.chapters) {
        routes.push({ slug, kind: 'chapter-root', chapterSlug: chapter.slug });
        for (let page = 2; page <= chapter.pages.length; page++) {
          routes.push({
            slug,
            kind: 'chapter-page',
            chapterSlug: chapter.slug,
            page,
          });
        }
      }
    }
  }

  return routes;
}

/**
 * Convert a {@link GuideRoutePath} to URL path segments relative to
 * `/[locale]/dojo/guides`. The returned segments are:
 *
 * - `root`         → `[slug]`
 * - `flat-page`    → `[slug, page]`
 * - `chapter-root` → `[slug, chapterSlug]`
 * - `chapter-page` → `[slug, chapterSlug, page]`
 *
 * Used by the sitemap and redirect helpers to build URLs without duplicating
 * string-concatenation logic.
 */
export function guideRouteToSegments(route: GuideRoutePath): string[] {
  switch (route.kind) {
    case 'root':
      return [route.slug];
    case 'flat-page':
      return [route.slug, String(route.page)];
    case 'chapter-root':
      return [route.slug, route.chapterSlug];
    case 'chapter-page':
      return [route.slug, route.chapterSlug, String(route.page)];
  }
}
