import { and, eq, isNull, or } from 'drizzle-orm';

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

/**
 * The same rule widened by one viewer: a game they may act on because it is
 * public, or because it is theirs. Soft-deleted is excluded on BOTH branches —
 * deleting a game removes it from its author's reach as well, which is why the
 * owner arm repeats `deleted_at IS NULL` rather than being an unguarded `OR
 * author_id = …`.
 *
 * `author_id` is null on an account-less game, so such a game only ever
 * qualifies through the public branch — no `viewerId` can match it.
 *
 * This is for write paths that need "could this member be looking at this
 * game": linking a chunk to a move, say, where accepting an id the site would
 * 404 for its sender lets a stale or guessed id reach the owner's
 * notifications. Read paths whose OUTPUT is viewer-independent — the gallery,
 * a feed row, a backlink list — must keep using {@link publiclyVisible}, or
 * they start rendering one member's unpublished game to that member only, with
 * no marker saying so.
 */
export function visibleToViewer(viewerId: string) {
  return or(publiclyVisible(), and(isNull(games.deletedAt), eq(games.authorId, viewerId)));
}
