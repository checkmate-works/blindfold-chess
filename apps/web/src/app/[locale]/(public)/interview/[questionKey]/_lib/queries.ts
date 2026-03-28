import { and, eq, isNull } from 'drizzle-orm';

import { chessOpenings, db, userInterviewAnswers } from '@/lib/db';

import type { InterviewQuestionKey } from '@/app/[locale]/_lib/interview';

export type InterviewAnswerDetail = {
  questionKey: InterviewQuestionKey;
  answerValue: string;
  openingName: string | null;
};

/**
 * Fetch a single interview answer for a user and question key.
 */
export async function getInterviewAnswer(
  userId: string,
  questionKey: string
): Promise<InterviewAnswerDetail | null> {
  const rows = await db
    .select({
      questionKey: userInterviewAnswers.questionKey,
      answerValue: userInterviewAnswers.answerValue,
      openingName: chessOpenings.name,
    })
    .from(userInterviewAnswers)
    .leftJoin(chessOpenings, eq(userInterviewAnswers.answerValue, chessOpenings.slug))
    .where(
      and(
        eq(userInterviewAnswers.userId, userId),
        eq(userInterviewAnswers.questionKey, questionKey),
        isNull(userInterviewAnswers.deletedAt)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;

  return rows[0] as InterviewAnswerDetail;
}
