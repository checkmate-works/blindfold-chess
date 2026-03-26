import { and, eq, isNull } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';

export async function getProfileByUsername(username: string) {
  const [profile] = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
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
}
