import { and, count, eq, isNull } from 'drizzle-orm';

import { db, profiles, topicPostLikes, topicPosts, userFollows } from '@/lib/db';

export type MypageDashboardData = {
  username: string | undefined;
  likesCount: number;
  followingCount: number;
};

export async function getMypageDashboardData(userId: string): Promise<MypageDashboardData> {
  const [profileResult, likesResult, followingResult] = await Promise.all([
    db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
    db
      .select({ value: count() })
      .from(topicPostLikes)
      .innerJoin(topicPosts, eq(topicPostLikes.postId, topicPosts.id))
      .where(and(eq(topicPostLikes.userId, userId), isNull(topicPosts.deletedAt))),
    db
      .select({ value: count() })
      .from(userFollows)
      .innerJoin(profiles, eq(userFollows.followingId, profiles.id))
      .where(and(eq(userFollows.followerId, userId), isNull(profiles.deletedAt))),
  ]);

  const username = profileResult[0]?.username;
  const likesCount = likesResult[0]?.value ?? 0;
  const followingCount = followingResult[0]?.value ?? 0;

  return { username, likesCount, followingCount };
}
