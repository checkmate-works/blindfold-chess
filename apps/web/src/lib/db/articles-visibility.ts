import { and, eq, isNotNull } from 'drizzle-orm';

import { articles } from './schema';

/**
 * The visibility rule for a published article: `published` status *and* a
 * non-null `published_at`.
 *
 * Both halves are load-bearing. `status` is what the admin publish form sets,
 * while `published_at` is what every public ordering and the locale-fallback
 * ranking read — a row with the status but no timestamp sorts as `NULL` and
 * would surface in an arbitrary position, so the reads exclude it rather than
 * guess. Spelling the pair out per query is what lets one of them drift to
 * checking only the status.
 *
 * A leaf module depending on nothing but the schema, for the same reason
 * `publiclyVisible` in `./games-visibility` is one: the predicate is needed by
 * the article queries and the sitemap, and importing it from the query module
 * would drag that module's graph along.
 *
 * Admin reads of unpublished articles are a separate path and deliberately do
 * not compose this.
 */
export function publiclyVisibleArticle() {
  return and(eq(articles.status, 'published'), isNotNull(articles.publishedAt));
}
