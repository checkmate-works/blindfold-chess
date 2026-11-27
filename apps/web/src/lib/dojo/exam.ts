/**
 * Grading an exam problem and recording a pass.
 *
 * @description
 * {@link submitExamProblem} is the server's one entry point for an exam
 * answer. The web's Server Action and the mobile API both call it, and it
 * grades with `gradeExamProblem` from `@blindfold-chess/features/dojo-journey`
 * — the same pure function the app and the web read their problems from — so
 * the pass mark lives in one place. Clients send the raw answer (the
 * recreated FEN for a position-memory problem, the player's own moves in SAN
 * for a puzzle) and never a verdict.
 *
 * @design One problem at a time; the rank is granted by the ordinary pass
 *
 * Each problem is solved and recorded on its own, as the step key
 * `exam:<rank>:<problem>` in `dojo_step_completions`. This function never
 * touches `user_ranks`: the caller runs the usual rank evaluation afterwards
 * (`evaluateRanksAfterCreate` or `evaluateRanksAndRefreshEntitlements`), and
 * once every problem of the exam is recorded, the `exam_problem` evaluator
 * lets `checkAndGrantRanks` grant the rank like any other. Doing the problems
 * singly means no progress state has to span screens (each one reuses an
 * existing practice session), and keeping the single grant path means the
 * web's promotion modal and the app's `grantedRanks` need nothing new.
 * Inserting into `user_ranks` directly on the last pass was rejected for
 * that reason.
 *
 * @design Only a player on that rung of the ladder gets a pass recorded
 *
 * A pass is recorded only when the exam is the rank right above the player's
 * highest held rank (for 2kyu: holding 3kyu) or a rank they already hold
 * (`isExamEligible`). Anyone else — and a signed-out player, whom the caller
 * handles without calling this — can still take the exam; it is graded as
 * practice and nothing is written (`recorded: false`). The app reads the
 * highest rank as covering every rank below it, so letting a player skip
 * ahead (pass 2kyu while holding only 5kyu) would show 4kyu and 3kyu as done
 * as well. The web follows the same rule so the two never disagree.
 */
import {
  examProblemFor,
  examRankOf,
  examStepKey,
  gradeExamProblem,
  isExamEligible,
} from '@blindfold-chess/features/dojo-journey';
import 'server-only';

import { db, dojoStepCompletions } from '@/lib/db';

import { getAchievedSlugsForUser } from '@/app/[locale]/(public)/dojo/ranks/_lib/queries';
import { resolveHighestAchievedSlug } from '@/app/[locale]/(public)/dojo/ranks/_lib/rank-progression';

/**
 * - `unknownExam`: `(exam, problem)` names no problem (unknown rank, a rank
 *   with no exam, or an unknown problem kind).
 * - `graded`: the answer was graded. `accuracy` is set for position-memory
 *   problems only (unrounded). `recorded` is true when the pass was written
 *   now or had been written before; it is false for a fail and for a pass by
 *   a player who may not have it recorded.
 */
export type SubmitExamResult =
  | { status: 'unknownExam' }
  | { status: 'graded'; passed: boolean; accuracy: number | null; recorded: boolean };

/**
 * Grades `answer` to `problem` of `exam` and, if it passes and the player
 * may have it recorded, writes the `exam:` step. Rank evaluation is the
 * caller's job (see the module header). `exam` and `problem` may come
 * straight from a request: unknown values answer `unknownExam`, and an
 * answer of the wrong shape is graded as a fail rather than thrown on.
 */
export async function submitExamProblem(
  userId: string,
  exam: string,
  problem: string,
  answer: unknown
): Promise<SubmitExamResult> {
  const examRank = examRankOf(exam);
  const examProblem = examProblemFor(exam, problem);
  if (!examRank || !examProblem) return { status: 'unknownExam' };

  const { passed, accuracy } = gradeExamProblem(examProblem, answer);
  if (!passed) return { status: 'graded', passed, accuracy, recorded: false };

  const highest = resolveHighestAchievedSlug(await getAchievedSlugsForUser(userId));
  if (!isExamEligible(examRank, highest ?? undefined)) {
    return { status: 'graded', passed, accuracy, recorded: false };
  }

  await db
    .insert(dojoStepCompletions)
    .values({ userId, stepKey: examStepKey(examRank, examProblem.kind) })
    .onConflictDoNothing({ target: [dojoStepCompletions.userId, dojoStepCompletions.stepKey] });
  return { status: 'graded', passed, accuracy, recorded: true };
}
