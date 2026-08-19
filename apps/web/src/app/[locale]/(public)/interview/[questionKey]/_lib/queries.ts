import { and, eq, isNull } from 'drizzle-orm';

import { chessOpenings, db, userInterviewAnswers } from '@/lib/db';

import type { InterviewAnswerRow } from '@/app/[locale]/(public)/interview/_lib/queries';

export type { InterviewAnswerRow as InterviewAnswerDetail };

/**
 * Fetch a single interview answer for a user and question key.
 */
export async function getInterviewAnswer(
  userId: string,
  questionKey: string
): Promise<InterviewAnswerRow | null> {
  const rows = await db
    .select({
      id: userInterviewAnswers.id,
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

  return rows[0] as InterviewAnswerRow;
}
