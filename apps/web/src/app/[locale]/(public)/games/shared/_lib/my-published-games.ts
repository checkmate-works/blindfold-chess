import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { countGamesByAuthorId } from '@/lib/db/games-read';

/** What the gallery needs to link a viewer at their own published games. */
export type MyPublishedGames = {
  /** Owner of the archive, i.e. the `/u/[username]/games` segment. */
  username: string;
  /** How many games that archive lists — same visibility rule as the gallery. */
  count: number;
};

/**
 * The signed-in viewer's own public-games archive, or `null` when there is
 * nothing worth linking at.
 *
 * `null` covers two cases, both of which would otherwise produce a dead end: a
 * provisional user (signed in, no `profiles` row) has no `/u/[username]` page
 * at all, and an author who has published nothing would land on an empty
 * archive.
 *
 * Games published without an account are not counted, because they carry no
 * `author_id` until their claim token is redeemed — the archive cannot list
 * them either, so counting them here would promise a link that under-delivers.
 * Those stay reachable through the browser-local `/games` list.
 */
export async function getMyPublishedGames(userId: string): Promise<MyPublishedGames | null> {
  const [[profile], count] = await Promise.all([
    db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
    countGamesByAuthorId(userId),
  ]);

  if (!profile || count === 0) return null;

  return { username: profile.username, count };
}
