import { cache } from 'react';

import { type SQL, and, eq, isNull, notInArray, or } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import 'server-only';

import { db, userBlocks } from '../db';
import { MODERATION_BLOCKED_ERROR } from './blocked-error';

export { MODERATION_BLOCKED_ERROR };

/**
 * Has `blockerId` blocked `blockedId`? Directional — used by the profile
 * render path to decide whether the viewer sees "Block" or "Unblock".
 *
 * Not wrapped in `React.cache` (unlike `isUserBanned`): the block checks run
 * at most once per render and, in {@link isBlockedBetween}'s case, from the
 * detached fire-and-forget notification path where no request-scoped cache
 * store exists.
 */
export async function hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
    .limit(1);
  return !!row;
}

/**
 * Is there a block in EITHER direction between the two users? This is the
 * predicate for suppressing actor→recipient notifications: once one side
 * blocks the other, neither should notify the other.
 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
        and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a))
      )
    )
    .limit(1);
  return !!row;
}

/**
 * Everyone the viewer has blocked, plus everyone who has blocked the viewer —
 * the ids whose authored rows the viewer's signed-in lists and feeds leave
 * out.
 *
 * One query for the whole set. A list read needs the verdict for every row it
 * is about to return, and {@link isBlockedBetween} answers for one pair, so
 * reusing it here would put a round trip on every card. Both directions are
 * covered by an index (`idx_user_blocks_blocker`, `idx_user_blocks_blocked`),
 * which is what lets the OR stay a single scan.
 *
 * Wrapped in `React.cache` because one page render asks several times over —
 * a feed page, the catalog beside it, and each list's own query — and they
 * should share one lookup. Outside a request (a Server Action, a background
 * job) React has no cache store and the call simply runs, so this is safe
 * everywhere; it just does not memoise there.
 */
export const getBlockedUserIds = cache(async (viewerId: string): Promise<string[]> => {
  const rows = await db
    .select({ blockerId: userBlocks.blockerId, blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(or(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, viewerId)));

  return [...new Set(rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId)))];
});

/**
 * A `WHERE` fragment that drops rows whose author the viewer is in a block
 * relationship with, ready to `and()` into a list query alongside that
 * query's own visibility rules.
 *
 * Returns `undefined` — which `and()` discards — for a signed-out viewer and
 * for a viewer who has blocked nobody, so the anonymous, crawler and
 * never-blocked views of every public catalog keep the exact SQL they had.
 * That is also the intended reach of this filter: it hides the other party
 * from the viewer's own authenticated pages, and the same rows stay reachable
 * by direct URL and to search engines, which is what keeps the public UGC
 * catalogs indexable. Blocking is a "stop showing me this" control here, not
 * a privacy boundary.
 *
 * @design Why the `IS NULL` arm is not optional
 * Every author column on this schema's UGC is nullable — a game published
 * without an account, a chunk or post whose author hard-deleted and left the
 * row behind. In SQL `author_id NOT IN (...)` evaluates to NULL, not true,
 * when `author_id` is NULL, and a NULL predicate excludes the row. So the
 * bare `NOT IN` would make every anonymous and orphaned item vanish from the
 * list the moment the viewer blocked anybody at all. The disjunct puts them
 * back. It is harmless on a NOT NULL column (`feed_items.actor_id`), so the
 * one spelling serves every caller.
 *
 * @design Why the matching COUNT stays unfiltered
 * Each paginated catalog pairs its list with a denominator, and those are
 * deliberately left alone. Several of them live in the Data Cache
 * (`unstable_cache` in the repertoire and topic-post query modules), keyed
 * without the viewer, so narrowing one per viewer would hand that viewer's
 * block list to whoever reads the cache next. The visible cost of leaving
 * them is a page that renders a few cards short of its stated total, and a
 * last page that can come up empty — cheaper than a cache that leaks who
 * blocked whom.
 */
export async function excludeBlockedAuthors(
  authorColumn: AnyPgColumn,
  viewerId: string | null | undefined
): Promise<SQL | undefined> {
  if (!viewerId) return undefined;

  const blockedIds = await getBlockedUserIds(viewerId);
  if (blockedIds.length === 0) return undefined;

  return or(isNull(authorColumn), notInArray(authorColumn, blockedIds));
}

/**
 * Guard for a user→user write: reject it once either party has blocked the
 * other.
 *
 * `otherId` is nullable because the counterparty is routinely unknown — an
 * account-less game, an anonymised author, a row whose owner column is null.
 * There is nobody to be blocked by in those cases, so the write proceeds. A
 * self-directed write (liking your own post, commenting on your own game) is
 * likewise never blocked, and short-circuits before the query runs.
 *
 * @returns The rejection to hand straight back to the caller's client, or
 * `null` when the interaction is allowed:
 *
 * ```ts
 * const blocked = await assertNotBlocked(user.id, owner.userId);
 * if (blocked) return blocked;
 * ```
 */
export async function assertNotBlocked(
  viewerId: string,
  otherId: string | null | undefined
): Promise<{ error: typeof MODERATION_BLOCKED_ERROR } | null> {
  if (!otherId || otherId === viewerId) return null;
  return (await isBlockedBetween(viewerId, otherId)) ? { error: MODERATION_BLOCKED_ERROR } : null;
}
