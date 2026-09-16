import { and, eq, isNull } from 'drizzle-orm';

import { games } from './schema';

/**
 * The visibility rule for a published game: `public` status and not
 * soft-deleted. Every public read path composes this, so no surface can leak a
 * game the gallery hides, and the planned owner-only `private` tier becomes a
 * one-line change here rather than a hunt for the spellings of the rule.
 *
 * Owner and admin views of non-public games are separate paths and
 * deliberately do not go through this.
 *
 * @design Why this is not in `games-read`
 * The rule is needed by the feed's liveness CASE and by rank evaluation, which
 * are otherwise unrelated to game reads. Importing it from `games-read` drags
 * in the opening detector and its module-scope `unstable_cache` call, which
 * fails in any test that mocks `next/cache` without that export. A leaf module
 * with only the schema as a dependency keeps the predicate reachable from
 * anywhere without pulling a graph behind it.
 */
export function publiclyVisible() {
  return and(isNull(games.deletedAt), eq(games.status, 'public'));
}
