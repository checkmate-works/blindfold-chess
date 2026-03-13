import { and, count, eq, gte, isNull, lt } from 'drizzle-orm';

import { db, practiceSessions, profiles, topicPostLikes, topicPosts, userFollows } from '@/lib/db';
import { getSessionScoreFields, parsePracticeSession } from '@/lib/db/practice-session-types';

import { getMondayOfWeek } from '../practice/_lib/period-utils';

export type MypageDashboardData = {
  username: string | undefined;
  likesCount: number;
  followingCount: number;
  weekSessionCount: number;
  weekBestScore: number;
};

export async function getMypageDashboardData(userId: string): Promise<MypageDashboardData> {
  const [profileResult, likesResult, followingResult, weekSessions] = await Promise.all([
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
    (() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monday = getMondayOfWeek(today);
      const endOfToday = new Date(today);
      endOfToday.setDate(endOfToday.getDate() + 1);

      return db
        .select()
        .from(practiceSessions)
        .where(
          and(
            eq(practiceSessions.userId, userId),
            gte(practiceSessions.startedAt, monday),
            lt(practiceSessions.startedAt, endOfToday)
          )
        );
    })(),
  ]);

  const username = profileResult[0]?.username;
  const likesCount = likesResult[0]?.value ?? 0;
  const followingCount = followingResult[0]?.value ?? 0;

  const parsedSessions = weekSessions.map(parsePracticeSession);
  const weekSessionCount = parsedSessions.length;
  const weekBestScore = parsedSessions.reduce((best, session) => {
    const fields = getSessionScoreFields(session);
    if (!fields) return best;
    return Math.max(best, fields.correctAnswers);
  }, 0);

  return { username, likesCount, followingCount, weekSessionCount, weekBestScore };
}
