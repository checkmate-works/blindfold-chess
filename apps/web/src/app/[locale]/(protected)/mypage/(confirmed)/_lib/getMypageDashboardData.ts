import { and, count, eq, inArray, isNull } from 'drizzle-orm';

import { db, likes, profiles, topicPosts, userInterviewAnswers } from '@/lib/db';

import { INTERVIEW_QUESTION_KEYS } from '@/app/[locale]/_lib/interview';

export type MypageDashboardData = {
  username: string | undefined;
  displayName: string | null;
  avatarUrl: string | null;
  likesCount: number;
  unansweredInterviewCount: number;
};

export async function getMypageDashboardData(userId: string): Promise<MypageDashboardData> {
  const [profileResult, likesResult, answeredResult] = await Promise.all([
    db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
    db
      .select({ value: count() })
      .from(likes)
      .innerJoin(topicPosts, eq(likes.targetId, topicPosts.id))
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.targetType, 'topic_post'),
          isNull(topicPosts.deletedAt)
        )
      ),
    db
      .select({ value: count() })
      .from(userInterviewAnswers)
      .where(
        and(
          eq(userInterviewAnswers.userId, userId),
          inArray(userInterviewAnswers.questionKey, [...INTERVIEW_QUESTION_KEYS]),
          isNull(userInterviewAnswers.deletedAt)
        )
      ),
  ]);

  const profile = profileResult[0];
  const username = profile?.username;
  const displayName = profile?.displayName ?? null;
  const avatarUrl = profile?.avatarUrl ?? null;
  const likesCount = likesResult[0]?.value ?? 0;
  const answeredCount = answeredResult[0]?.value ?? 0;
  const unansweredInterviewCount = Math.max(0, INTERVIEW_QUESTION_KEYS.length - answeredCount);

  return { username, displayName, avatarUrl, likesCount, unansweredInterviewCount };
}
