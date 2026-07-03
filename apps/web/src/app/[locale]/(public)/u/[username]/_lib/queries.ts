import { cache } from 'react';

import { and, eq, isNull } from 'drizzle-orm';

import { AUTHOR_PROFILE_COLUMNS, db, profiles } from '@/lib/db';

/**
 * Wrapped with `React.cache` so the metadata generator and the page
 * component can both call `getProfileByUsername(username)` without
 * issuing a duplicate `profiles` lookup per request.
 */
export const getProfileByUsername = cache(async (username: string) => {
  const [profile] = await db
    .select({
      ...AUTHOR_PROFILE_COLUMNS,
      id: profiles.id,
      bio: profiles.bio,
      country: profiles.country,
      flair: profiles.flair,
      fideId: profiles.fideId,
      chesscomUsername: profiles.chesscomUsername,
      lichessUsername: profiles.lichessUsername,
      xUsername: profiles.xUsername,
      instagramUsername: profiles.instagramUsername,
      youtubeHandle: profiles.youtubeHandle,
    })
    .from(profiles)
    .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
    .limit(1);

  return profile ?? null;
});
