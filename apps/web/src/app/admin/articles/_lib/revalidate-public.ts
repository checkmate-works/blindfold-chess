// eslint-disable-next-line no-restricted-imports -- /[locale]/articles/[slug] is the app's only prerendered page, making this the one place revalidatePath does real cache work; see this module's TSDoc
import { revalidatePath, revalidateTag } from 'next/cache';

import { SUPPORTED_LOCALES } from '@/config';

import { ARTICLES_CACHE_TAG } from '@/lib/cache-tags';

/**
 * Invalidate the prerendered public article detail pages for `slug`.
 *
 * `/[locale]/articles/[slug]` is prerendered by `generateStaticParams` for
 * every (locale × published slug) and refreshed on a 1800 s ISR timer, so an
 * admin edit, publish, or delete would otherwise stay invisible on the public
 * page for up to 30 minutes, and a deleted article would keep being served
 * from the static cache.
 *
 * `revalidateTag(ARTICLES_CACHE_TAG)` does NOT cover this, for a specific
 * reason: a tag reaches a prerendered page only if the render read an
 * `unstable_cache` entry carrying it, and the detail page's own read,
 * `getPublishedArticle`, is a per-request `React.cache` with no tag. The tag
 * covers the list queries and nothing else, so the path purge is the only
 * thing that names the detail page.
 *
 * Every locale is revalidated for the slug, not just the edited row's own
 * locale: `getPublishedArticle` falls back across locales, so an edit to the
 * `en` row can change what the `ja` page renders.
 */
export function revalidatePublicArticlePages(...slugs: (string | null | undefined)[]): void {
  const unique = [...new Set(slugs.filter((s): s is string => !!s))];
  for (const slug of unique) {
    for (const locale of SUPPORTED_LOCALES) {
      revalidatePath(`/${locale}/articles/${slug}`);
    }
  }
}

/**
 * Invalidate everything an article mutation can affect: the tag-cached
 * article reads, and the prerendered public detail pages the tag cannot
 * reach. Pass every slug involved — for a rename, both the new and the
 * previous one.
 *
 * Both halves are needed on every path, and the pair was written out at each
 * of the three mutations. Following the precedent of `revalidateAdCreatives`,
 * which exists because hand-rolling its pair had already produced partial
 * coverage.
 */
export function revalidateArticles(...slugs: (string | null | undefined)[]): void {
  revalidateTag(ARTICLES_CACHE_TAG, { expire: 60 });
  revalidatePublicArticlePages(...slugs);
}
