'use server';

import { getOptionalUser } from '@/lib/auth';

import { getInterviewAnswers } from '../_lib/queries';

/**
 * Return the list of interview question keys the currently-signed-in user
 * has already answered, or an empty array for anonymous visitors. Used by
 * the ISR-cached interview index to overlay per-user "answered ✓" state on
 * top of the otherwise-static question grid.
 *
 * Returns `string[]` rather than `Set<string>` because Server Action return
 * values are JSON-serialised between server and client.
 */
export async function getCurrentUserAnsweredKeys(): Promise<{
  isAuthenticated: boolean;
  answeredKeys: string[];
}> {
  const user = await getOptionalUser();
  if (!user) return { isAuthenticated: false, answeredKeys: [] };
  const answers = await getInterviewAnswers(user.id);
  return { isAuthenticated: true, answeredKeys: answers.map((a) => a.questionKey) };
}
