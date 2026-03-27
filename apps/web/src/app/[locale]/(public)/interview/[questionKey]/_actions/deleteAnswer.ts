'use server';

import { revalidatePath } from 'next/cache';

import { and, eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { isUserBanned } from '@/lib/ban';
import { db, userInterviewAnswers } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { INTERVIEW_QUESTION_KEYS } from '@/app/[locale]/_lib/interview';

export type DeleteAnswerResult = ActionResult;

export async function deleteAnswerAction(
  questionKey: string,
  locale: string
): Promise<DeleteAnswerResult> {
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

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.deleteInterviewAnswer);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  // Validate question key
  if (!(INTERVIEW_QUESTION_KEYS as readonly string[]).includes(questionKey)) {
    return { error: 'invalidQuestionKey' };
  }

  const result = await db
    .delete(userInterviewAnswers)
    .where(
      and(
        eq(userInterviewAnswers.userId, user.id),
        eq(userInterviewAnswers.questionKey, questionKey)
      )
    )
    .returning({ questionKey: userInterviewAnswers.questionKey });

  if (result.length === 0) {
    return { error: 'notFound' };
  }

  revalidatePath(`/${locale}/interview`);
  revalidatePath(`/${locale}/interview/${questionKey}`);

  return { success: true };
}
