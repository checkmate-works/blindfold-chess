/**
 * Reading and writing a user's completed dojo steps (`dojo_step_completions`).
 *
 * @description
 * A step key is either `guide:<rank>:<page>` (a guide page worked through) or
 * `exam:<rank>:<problem>` (an exam problem passed). This module is the one
 * place a client's report of completed steps is turned into rows.
 *
 * @design Clients may report guide pages only
 *
 * {@link recordGuideSteps} accepts a key only if it passes `isGuideStepKey`,
 * which refuses every `exam:` key. A guide page is a "worked on it" mark that
 * grants nothing, so taking the client's word for it is fine. An exam pass is
 * evidence for a rank — the `exam_problem` requirement reads it — so it is
 * written only by `submitExamProblem` (`./exam.ts`) after the server grades
 * the answer itself. If this function took `exam:` keys, calling the API
 * directly would be enough to earn a rank.
 *
 * @design Idempotent, append-only
 *
 * Rows are inserted with `onConflictDoNothing` on the `(user_id, step_key)`
 * primary key and never removed, so a client resending pages it already
 * reported (after a lost response, or a second device) gets the same answer
 * and changes nothing.
 */
import { isGuideStepKey } from '@blindfold-chess/features/dojo-journey';
import { asc, eq } from 'drizzle-orm';
import 'server-only';

import { db, dojoStepCompletions } from '@/lib/db';

export type RecordGuideStepsResult = { completed: string[]; rejected: string[] };

/**
 * Records the guide step keys a client reports as read.
 *
 * Every entry lands in exactly one list: `completed` for valid guide keys
 * (whether newly written or recorded before; a key repeated in the request
 * appears once), `rejected` for anything else — `exam:` keys, malformed keys,
 * guide pages out of range, and non-string entries (reported as
 * `String(entry)`). The caller bounds how many entries a request may carry.
 */
export async function recordGuideSteps(
  userId: string,
  steps: readonly unknown[]
): Promise<RecordGuideStepsResult> {
  const completed = new Set<string>();
  const rejected: string[] = [];
  for (const step of steps) {
    if (isGuideStepKey(step)) completed.add(step);
    else rejected.push(String(step));
  }

  if (completed.size > 0) {
    await db
      .insert(dojoStepCompletions)
      .values([...completed].map((stepKey) => ({ userId, stepKey })))
      .onConflictDoNothing({ target: [dojoStepCompletions.userId, dojoStepCompletions.stepKey] });
  }

  return { completed: [...completed], rejected };
}

/** Every step key the user has completed (guide pages and exam passes), sorted. */
export async function getCompletedSteps(userId: string): Promise<string[]> {
  const rows = await db
    .select({ stepKey: dojoStepCompletions.stepKey })
    .from(dojoStepCompletions)
    .where(eq(dojoStepCompletions.userId, userId))
    .orderBy(asc(dojoStepCompletions.stepKey));
  return rows.map((row) => row.stepKey);
}
