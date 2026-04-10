import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getRankGuide } from './guideData';

/**
 * One reachable URL under `/[locale]/guides/ranks/...`, described in
 * locale-agnostic terms. `kind` matches the four canonical layers:
 *
 * - `root`        → `/guides/ranks/[rank]`                          (flat page 1 or chapter list)
 * - `flat-page`   → `/guides/ranks/[rank]/[page]`                   (flat pages 2..N)
 * - `chapter-root`→ `/guides/ranks/[rank]/[chapter]`                (chapter page 1)
 * - `chapter-page`→ `/guides/ranks/[rank]/[chapter]/[page]`         (chapter pages 2..N)
 *
 * Canonical redirects (`/[rank]/1` → `/[rank]`, `/[rank]/[chapter]/1` → `/[rank]/[chapter]`)
 * mean `page === 1` is NEVER emitted for the `*-page` kinds.
 */
export type GuideRoutePath =
  | { slug: RankSlug; kind: 'root' }
  | { slug: RankSlug; kind: 'flat-page'; page: number }
  | { slug: RankSlug; kind: 'chapter-root'; chapterSlug: string }
  | { slug: RankSlug; kind: 'chapter-page'; chapterSlug: string; page: number };

/**
 * Enumerate every distinct route under `/guides/ranks/...` that exists for
 * the given `guides.pages` data. Locale-agnostic: callers layer `SUPPORTED_LOCALES`
 * on top for `generateStaticParams` or sitemap generation.
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
 * `/[locale]/guides/ranks`. The returned segments are:
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
