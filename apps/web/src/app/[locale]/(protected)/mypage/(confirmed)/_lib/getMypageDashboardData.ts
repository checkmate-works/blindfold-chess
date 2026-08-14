import { and, count, eq, inArray, isNull } from 'drizzle-orm';

import { db, likes, topicPosts, userExp, userInterviewAnswers } from '@/lib/db';
import { type PointBalanceSummary, getPointBalanceSummary } from '@/lib/points';
import { getViewerProfile } from '@/lib/users/viewer-profile';

import { INTERVIEW_QUESTION_KEYS } from '@/app/[locale]/_lib/interview';

export type MypageDashboardData = {
  username: string | undefined;
  displayName: string | null;
  avatarUrl: string | null;
  likesCount: number;
  unansweredInterviewCount: number;
  totalExp: number;
  pointBalance: PointBalanceSummary;
};

export async function getMypageDashboardData(userId: string): Promise<MypageDashboardData> {
  const [profile, likesResult, answeredResult, expResult, pointBalance] = await Promise.all([
    getViewerProfile(userId),
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
    db
      .select({ totalExp: userExp.totalExp })
      .from(userExp)
      .where(eq(userExp.userId, userId))
      .limit(1),
    getPointBalanceSummary(userId),
  ]);

  const username = profile?.username;
  const displayName = profile?.displayName ?? null;
  const avatarUrl = profile?.avatarUrl ?? null;
  const likesCount = likesResult[0]?.value ?? 0;
  const answeredCount = answeredResult[0]?.value ?? 0;
  const unansweredInterviewCount = Math.max(0, INTERVIEW_QUESTION_KEYS.length - answeredCount);
  const totalExp = expResult[0]?.totalExp ?? 0;

  return {
    username,
    displayName,
    avatarUrl,
    likesCount,
    unansweredInterviewCount,
    totalExp,
    pointBalance,
  };
}
