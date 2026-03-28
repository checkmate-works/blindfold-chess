'use server';

import { revalidatePath } from 'next/cache';

import { and, eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { chessOpenings, db, userInterviewAnswers } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import {
  INTERVIEW_QUESTION_KEYS,
  type InterviewQuestionKey,
  QUESTION_CONFIG,
} from '@/app/[locale]/_lib/interview';

export type SaveAnswerResult = ActionResult;

export async function saveAnswerAction(
  questionKey: string,
  locale: string,
  _prevState: SaveAnswerResult | null,
  formData: FormData
): Promise<SaveAnswerResult> {
  const answerValue = formData.get('answerValue') as string | null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'unauthorized' };
  }

  if (await isUserBanned(user.id)) {
    return { error: 'banned' };
  }

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.saveInterviewAnswer);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  // Validate question key
  if (!(INTERVIEW_QUESTION_KEYS as readonly string[]).includes(questionKey)) {
    return { error: 'invalidQuestionKey' };
  }

  const typedKey = questionKey as InterviewQuestionKey;
  const config = QUESTION_CONFIG[typedKey];

  if (!answerValue || answerValue.trim() === '') {
    return { error: 'invalidAnswerValue' };
  }

  // Validate answer value based on question type
  if (config.answerType === 'master_ref') {
    const [opening] = await db
      .select({ slug: chessOpenings.slug })
      .from(chessOpenings)
      .where(eq(chessOpenings.slug, answerValue))
      .limit(1);

    if (!opening) {
      return { error: 'invalidAnswerValue' };
    }
  }

  // Check if already answered (including soft-deleted records)
  const existing = await db
    .select({ deletedAt: userInterviewAnswers.deletedAt })
    .from(userInterviewAnswers)
    .where(
      and(
        eq(userInterviewAnswers.userId, user.id),
        eq(userInterviewAnswers.questionKey, questionKey)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (!existing[0].deletedAt) {
      return { error: 'alreadyAnswered' };
    }
    // Soft-deleted → restore
    await db
      .update(userInterviewAnswers)
      .set({ answerValue: answerValue.trim(), deletedAt: null })
      .where(
        and(
          eq(userInterviewAnswers.userId, user.id),
          eq(userInterviewAnswers.questionKey, questionKey)
        )
      );
  } else {
    // New insert
    await db.insert(userInterviewAnswers).values({
      userId: user.id,
      questionKey,
      answerValue: answerValue.trim(),
    });
  }

  logActivityEvent({
    userId: user.id,
    action: 'save_interview_answer',
    targetType: 'interview_answer',
    targetId: questionKey,
    metadata: { answerValue: answerValue.trim() },
  });

  revalidatePath(`/${locale}/interview`);
  revalidatePath(`/${locale}/interview/${questionKey}`);

  return { success: true };
}
