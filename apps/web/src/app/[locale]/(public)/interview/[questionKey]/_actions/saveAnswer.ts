'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
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

  // Check if already answered
  try {
    await db.insert(userInterviewAnswers).values({
      userId: user.id,
      questionKey,
      answerValue: answerValue.trim(),
    });
  } catch {
    // Primary key constraint violation means already answered
    return { error: 'alreadyAnswered' };
  }

  revalidatePath(`/${locale}/interview`);
  revalidatePath(`/${locale}/interview/${questionKey}`);

  return { success: true };
}
