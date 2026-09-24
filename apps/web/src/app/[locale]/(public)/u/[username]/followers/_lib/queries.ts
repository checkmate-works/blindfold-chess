import { type SQL, and, count, desc, eq } from 'drizzle-orm';

import { AUTHOR_PROFILE_COLUMNS, db, profiles, userFollows } from '@/lib/db';
import { profileNotDeleted } from '@/lib/db/profile-not-deleted';
import { excludeBlockedAuthors } from '@/lib/moderation/block';

/**
 * Who a profile's follower list shows to this viewer: live followers, minus
 * anyone the viewer is in a block with.
 *
 * The count and the list take this one predicate so the pager never promises
 * a page the list cannot fill — the same reason both use
 * {@link profileNotDeleted} rather than the join's `deletedAt` check.
 *
 * Narrowing the count per viewer is safe here, unlike the catalog counts
 * `excludeBlockedAuthors` warns about: this page renders dynamically and the
 * count is read straight from the database, so no other viewer ever sees the
 * number it produces. The follower total in the profile header is a separate
 * query and stays unfiltered; a signed-in viewer with a block among the
 * followers sees this list come up that many short of it.
 *
 * The profile owner never has a blocked account among their own followers —
 * blocking deletes the follow in both directions — so for them the filter
 * changes nothing. It is only a third party's list, where a user the viewer
 * blocked (or who blocked the viewer) can still follow the profile being
 * browsed, that loses rows.
 */
async function followersOf(
  profileId: string,
  viewerId: string | undefined
): Promise<SQL | undefined> {
  return and(
    eq(userFollows.followingId, profileId),
    profileNotDeleted(userFollows.followerId),
    await excludeBlockedAuthors(userFollows.followerId, viewerId)
  );
}

export async function countVisibleFollowers(
  profileId: string,
  viewerId: string | undefined
): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(userFollows)
    .where(await followersOf(profileId, viewerId));
  return row?.count ?? 0;
}

export async function listVisibleFollowers(
  profileId: string,
  viewerId: string | undefined,
  { limit, offset }: { limit: number; offset: number }
) {
  return (
    db
      .select({
        ...AUTHOR_PROFILE_COLUMNS,
        id: profiles.id,
      })
      .from(userFollows)
      // The join is only here to project the profile columns; the filter is
      // `profileNotDeleted` inside `followersOf`, shared with the count. That
      // the join does not narrow the result any further — the two questions
      // differ on a follow whose profile row is absent rather than
      // soft-deleted — is argued on the helper's `@design` note, from the
      // cascade pair on `auth.users`.
      .innerJoin(profiles, eq(userFollows.followerId, profiles.id))
      .where(await followersOf(profileId, viewerId))
      .orderBy(desc(userFollows.createdAt))
      .limit(limit)
      .offset(offset)
  );
}
