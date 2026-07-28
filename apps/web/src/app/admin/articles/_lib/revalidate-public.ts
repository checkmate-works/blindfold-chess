import { revalidatePath } from 'next/cache';

import { SUPPORTED_LOCALES } from '@/config';

/**
 * Invalidate the prerendered public article detail pages for `slug`.
 *
 * `/[locale]/articles/[slug]` is the ONLY genuinely cached page in this app —
 * it is the single `●` (SSG) entry in the build's route table, prerendered by
 * `generateStaticParams` for every (locale × published slug) and refreshed on
 * a 1800 s ISR timer. Everything else is `ƒ` (dynamic) and re-queries on each
 * request.
 *
 * That makes this the one place where `revalidatePath` does real work: without
 * it an admin edit, publish, or delete stays invisible on the public page for
 * up to 30 minutes, and a deleted article keeps being served from the static
 * cache. `revalidateTag(ARTICLES_CACHE_TAG)` does NOT cover this — that tag
 * only reaches the `unstable_cache` list queries, not the Full Route Cache
 * entry for a rendered page.
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
