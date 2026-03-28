'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, userInterviewAnswers } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export type DeleteAnswerResult = ActionResult;

export async function deleteAnswerAction(
  answerId: string,
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

  const result = await db
    .update(userInterviewAnswers)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(userInterviewAnswers.id, answerId),
        eq(userInterviewAnswers.userId, user.id),
        isNull(userInterviewAnswers.deletedAt)
      )
    )
    .returning({ id: userInterviewAnswers.id, questionKey: userInterviewAnswers.questionKey });

  if (result.length === 0) {
    return { error: 'notFound' };
  }

  logActivityEvent({
    userId: user.id,
    action: 'delete_interview_answer',
    targetType: 'interview_answer',
    targetId: result[0].id,
  });

  revalidatePath(`/${locale}/interview`);
  revalidatePath(`/${locale}/interview/${result[0].questionKey}`);

  return { success: true };
}
