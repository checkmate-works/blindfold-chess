import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * Build an absolute URL path for any page under `/[locale]/guides/ranks/[rank]`.
 *
 * The overload shapes mirror the four valid routes:
 *
 * | route                        | args                                              |
 * | ---------------------------- | ------------------------------------------------- |
 * | rank root                    | `{ kind: 'root' }`                                |
 * | flat page 2..N               | `{ kind: 'flat-page', page }`                     |
 * | chapter root                 | `{ kind: 'chapter-root', chapterSlug }`           |
 * | chapter page 2..N            | `{ kind: 'chapter-page', chapterSlug, page }`     |
 *
 * Page 1 should never be passed to `flat-page` / `chapter-page`; callers must
 * use `root` / `chapter-root` instead to avoid emitting the redirect-bound
 * `/1` URL. To make this automatic for pagination links (where page may be
 * 1), use {@link buildFlatHref} / {@link buildChapterHref}, which collapse
 * page === 1 to the canonical root path.
 */
export type GuidePathTarget =
  | { kind: 'root' }
  | { kind: 'flat-page'; page: number }
  | { kind: 'chapter-root'; chapterSlug: string }
  | { kind: 'chapter-page'; chapterSlug: string; page: number };

function base(locale: string, slug: string): string {
  return `/${locale}/guides/ranks/${slug}`;
}

export function buildGuidePath(locale: string, slug: RankSlug, target: GuidePathTarget): string {
  const root = base(locale, slug);
  switch (target.kind) {
    case 'root':
      return root;
    case 'flat-page':
      return `${root}/${target.page}`;
    case 'chapter-root':
      return `${root}/${target.chapterSlug}`;
    case 'chapter-page':
      return `${root}/${target.chapterSlug}/${target.page}`;
  }
}

/**
 * Pagination-friendly flat href. `page === 1` collapses to the rank root.
 */
export function buildFlatHref(locale: string, slug: RankSlug, page: number): string {
  return page === 1
    ? buildGuidePath(locale, slug, { kind: 'root' })
    : buildGuidePath(locale, slug, { kind: 'flat-page', page });
}

/**
 * Pagination-friendly chapter href. `page === 1` collapses to the chapter root.
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
