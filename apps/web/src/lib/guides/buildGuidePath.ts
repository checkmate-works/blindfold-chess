import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * Discriminated union describing any reachable page under
 * `/[locale]/dojo/guides/[rank]`. This is the **single source of truth** for
 * the shape; `GuideRoutePath` in `enumerateGuideRoutes.ts` is derived from it.
 *
 * | kind            | meaning                                               |
 * | --------------- | ----------------------------------------------------- |
 * | `root`          | rank root (flat page 1 or chapter list)               |
 * | `flat-page`     | flat-format page 2..N                                 |
 * | `chapter-root`  | chaptered-format chapter page 1                       |
 * | `chapter-page`  | chaptered-format chapter page 2..N                    |
 *
 * Canonical-URL redirects (`/[rank]/1` → `/[rank]`,
 * `/[rank]/[chapter]/1` → `/[rank]/[chapter]`) mean `page === 1` should never
 * be passed to the `*-page` variants via this type directly. The pagination
 * helpers {@link buildFlatHref} / {@link buildChapterHref} do that collapse
 * automatically; use those for pagination UI.
 */
export type GuidePathTarget =
  | { kind: 'root' }
  | { kind: 'flat-page'; page: number }
  | { kind: 'chapter-root'; chapterSlug: string }
  | { kind: 'chapter-page'; chapterSlug: string; page: number };

/**
 * Shared core: build the locale-relative path suffix after `/dojo/guides/`.
 * Returned value always starts with the rank slug (no leading slash).
 */
function guideSuffix(slug: RankSlug, target: GuidePathTarget): string {
  switch (target.kind) {
    case 'root':
      return slug;
    case 'flat-page':
      return `${slug}/${target.page}`;
    case 'chapter-root':
      return `${slug}/${target.chapterSlug}`;
    case 'chapter-page':
      return `${slug}/${target.chapterSlug}/${target.page}`;
  }
}

/**
 * Build an absolute URL path (including `/[locale]/` prefix) for any page
 * under `/[locale]/dojo/guides/[rank]`.
 *
 * Use this for `<Link href={...}>` on server components, redirects
 * (`redirect(...)`), and any place where you need a full URL path.
 */
export function buildGuidePath(locale: string, slug: RankSlug, target: GuidePathTarget): string {
  return `/${locale}/dojo/guides/${guideSuffix(slug, target)}`;
}

/**
 * Build a **locale-relative** URL path for any page under
 * `/dojo/guides/[rank]`. The returned value starts with `/dojo/guides/` and has
 * NO `/[locale]/` prefix.
 *
 * Use this for:
 *
 * 1. `Breadcrumb` items — the `Breadcrumb` component prepends `locale` to
 *    every item href internally, so passing an absolute path would produce
 *    `/en/en/guides/...`. Breadcrumb items need the locale-relative form.
 * 2. `generateCanonicalMetadata({ path })` — that helper also adds the
 *    locale prefix itself and expects a path WITHOUT one.
 *
 * In practice, any site-wide helper that itself prepends the locale wants
 * this variant; any direct consumer (Next.js `<Link>`, `redirect(...)`) wants
 * {@link buildGuidePath}.
 */
export function buildGuidePathRelative(slug: RankSlug, target: GuidePathTarget): string {
  return `/dojo/guides/${guideSuffix(slug, target)}`;
}

/**
 * Path suffix WITHOUT any leading `/` or `/dojo/guides/` prefix. Suitable
 * for `generateCanonicalMetadata({ path })`, which internally prepends
 * `/<locale>/`. Returned value looks like e.g. `dojo/guides/5kyu/3`.
 */
export function buildGuideCanonicalPath(slug: RankSlug, target: GuidePathTarget): string {
  return `dojo/guides/${guideSuffix(slug, target)}`;
}

/**
 * Pagination-friendly flat href. `page === 1` collapses to the rank root.
 * Returns an absolute (locale-prefixed) URL path.
 */
export function buildFlatHref(locale: string, slug: RankSlug, page: number): string {
  return page === 1
    ? buildGuidePath(locale, slug, { kind: 'root' })
    : buildGuidePath(locale, slug, { kind: 'flat-page', page });
}

/**
 * Pagination-friendly chapter href. `page === 1` collapses to the chapter root.
 * Returns an absolute (locale-prefixed) URL path.
 */
export function buildChapterHref(
  locale: string,
  slug: RankSlug,
  chapterSlug: string,
  page: number
): string {
  return page === 1
    ? buildGuidePath(locale, slug, { kind: 'chapter-root', chapterSlug })
    : buildGuidePath(locale, slug, { kind: 'chapter-page', chapterSlug, page });
}
