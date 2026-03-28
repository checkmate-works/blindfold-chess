import { and, eq, inArray, isNull } from 'drizzle-orm';

import { chessOpenings, db, userInterviewAnswers } from '@/lib/db';

import { INTERVIEW_QUESTION_KEYS, type InterviewQuestionKey } from '@/app/[locale]/_lib/interview';

export type InterviewAnswerRow = {
  questionKey: InterviewQuestionKey;
  answerValue: string;
  openingName: string | null;
};

/**
 * Fetch all interview answers for a given user.
 * For "master_ref" type answers (e.g., favorite_opening), the answer_value
 * is expected to be a chess opening slug, so we join with chess_openings
 * to resolve the opening name.
 */
export async function getInterviewAnswers(userId: string): Promise<InterviewAnswerRow[]> {
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
        inArray(userInterviewAnswers.questionKey, [...INTERVIEW_QUESTION_KEYS]),
        isNull(userInterviewAnswers.deletedAt)
      )
    );

  return rows as InterviewAnswerRow[];
}
