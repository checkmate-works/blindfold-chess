'use server';

import { authenticateAndGuard } from '@/lib/auth';
import { evaluateRanksAndRefreshEntitlements } from '@/lib/db/rank-grant-flow';
import { submitExamProblem } from '@/lib/dojo/exam';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import type { SubmitExamAnswerResult } from '../_lib/types';

/**
 * Grades one answer to one problem of a rank's exam and, when it passes and
 * may be recorded, records it and runs the rank evaluation.
 *
 * @description
 * The answer is the raw attempt, never a verdict: the recreated FEN
 * (`{ fen }`) for a position-memory problem, the player's own moves in SAN
 * (`{ moves }`) for a puzzle. Grading happens on the server in
 * `submitExamProblem`, which calls the shared pure grader from
 * `@blindfold-chess/features/dojo-journey`; the mobile API calls the same
 * function, so the web and the app pass and fail the same answers. All three
 * arguments come from the client and are treated as untrusted —
 * `submitExamProblem` answers `unknownExam` for an unknown rank or kind and
 * fails an answer of the wrong shape.
 *
 * @design One problem per call, one record per problem
 *
 * Each problem is solved in its own existing practice session and recorded
 * on its own; nothing ties the two problems of an exam into a single run.
 * Joining them would need progress that survives moving between screens,
 * whereas one at a time reuses the sessions as they are and lets the
 * problem list show how many are done. The rank itself is not granted here:
 * once every problem of the exam is on record, the ordinary rank evaluation
 * (`checkAndGrantRanks`, reached through
 * `evaluateRanksAndRefreshEntitlements`) grants it like any other rank, so
 * the promotion modal and the dan-tier ad-free refresh need nothing new.
 * The evaluation runs only after a recorded pass — a fail or an unrecorded
 * pass cannot change any rank.
 *
 * A signed-out caller gets `signInRequired` and grades the attempt in the
 * browser as practice; a signed-in player who is not yet on that rank's rung
 * gets `recorded: false` (see `submitExamProblem`).
 */
export async function submitExamAnswer(
  rank: string,
  problem: string,
  answer: unknown
): Promise<SubmitExamAnswerResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.dojoExam);
  if ('error' in guard) return { error: guard.error };

  const result = await submitExamProblem(guard.user.id, rank, problem, answer);
  if (result.status === 'unknownExam') return { error: 'unknownExam' };

  const { passed, accuracy, recorded } = result;
  const grantedRanks = recorded
    ? await evaluateRanksAndRefreshEntitlements(guard.user.id, 'dojo exam')
    : [];
  return { success: true, passed, accuracy, recorded, grantedRanks };
}
