'use server';

// eslint-disable-next-line no-restricted-imports -- OpeningSelectForm submits via useActionState with no navigation or refresh; revalidating the current question page is the only thing that flips it to its answered view, and /interview needs its answered marks updated
import { revalidatePath } from 'next/cache';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { chessOpenings, db, userInterviewAnswers } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import type { InterviewQuestionKey } from '@/app/[locale]/_lib/interview';
import { INTERVIEW_QUESTION_KEYS, QUESTION_CONFIG } from '@/app/[locale]/_lib/interview';

export type SaveAnswerResult = ActionResult;

export async function saveAnswerAction(
  questionKey: string,
  locale: string,
  _prevState: SaveAnswerResult | null,
  formData: FormData
): Promise<SaveAnswerResult> {
  assertSupportedLocale(locale);

  const answerValue = formData.get('answerValue') as string | null;

  const guardResult = await authenticateAndGuard(RATE_LIMITS.saveInterviewAnswer);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

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

  // Insert new answer — relies on partial unique index
  // (uq_user_interview_answers_active) to prevent duplicates.
  try {
    await db.insert(userInterviewAnswers).values({
      userId: user.id,
      questionKey,
      answerValue: answerValue.trim(),
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return { error: 'alreadyAnswered' };
    }
    throw err;
  }

  revalidatePath(`/${locale}/interview`);
  revalidatePath(`/${locale}/interview/${questionKey}`);

  return { success: true };
}
