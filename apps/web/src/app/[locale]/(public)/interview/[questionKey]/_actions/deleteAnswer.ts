'use server';

import { revalidatePath } from 'next/cache';

import { and, eq } from 'drizzle-orm';

import { isUserBanned } from '@/lib/ban';
import { db, userInterviewAnswers } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { INTERVIEW_QUESTION_KEYS } from '@/app/[locale]/_lib/interview';

export type DeleteAnswerState = {
  error?: string;
};

export async function deleteAnswerAction(
  questionKey: string,
  locale: string
): Promise<DeleteAnswerState> {
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

  return {};
}
