import { and, eq, isNull } from 'drizzle-orm';

import { repertoires } from './schema';

/**
 * Live repertoires visible to everyone.
 *
 * Filters on `status = 'public'` even though nothing writes that column today
 * (every repertoire is public by default): the paid-plan "make private" toggle
 * then becomes a UI change with no query to revisit — and, more importantly, a
 * repertoire that IS private must never appear in a public listing. That only
 * holds while every public read composes this instead of restating it; the
 * sitemap restated it, and would have been the one place still enumerating
 * private repertoires the day the toggle ships.
 *
 * A leaf module depending on nothing but the schema, for the same reason
 * `publiclyVisible` in `./games-visibility` is one: the sitemap needs the
 * predicate and nothing else from `@/lib/repertoires/queries`, whose module
 * scope builds two `unstable_cache` wrappers and reaches the follow graph and
 * the ownership guard. Importing the rule should not import that.
 */
export function publicRepertoiresOnly() {
  return and(eq(repertoires.status, 'public'), isNull(repertoires.deletedAt));
}
