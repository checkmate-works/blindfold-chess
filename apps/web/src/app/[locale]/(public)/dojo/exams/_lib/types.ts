/**
 * Shapes the dojo exam's Server Actions return. They live here, not in the
 * `"use server"` files, because a type exported from a Server Action file
 * can survive the action transform as a value reference and throw a
 * `ReferenceError` on the first call.
 */
import type { ExamProblemKind } from '@blindfold-chess/features/dojo-ranks';

import type { ActionResult } from '@/lib/action-types';
import type { AuthGuardError } from '@/lib/auth';
import type { GrantedRank } from '@/lib/db/data/ranks';

/**
 * `signInRequired` is the one the client acts on: a signed-out player still
 * takes the exam, graded in the browser as practice.
 */
export type SubmitExamAnswerError = AuthGuardError | 'unknownExam';

/**
 * `accuracy` is set for position-memory problems only and is unrounded.
 * `recorded` is true when the pass is on record (written now or before);
 * false for a fail and for a pass by a player not yet on that rank's rung.
 * `grantedRanks` is what the rank evaluation granted after recording — the
 * exam's rank once its last problem is in.
 */
export type SubmitExamAnswerResult = ActionResult<
  { passed: boolean; accuracy: number | null; recorded: boolean; grantedRanks: GrantedRank[] },
  SubmitExamAnswerError
>;

/**
 * What the exam's problem list shows the viewer: nothing personal when
 * signed out; otherwise which problems are already passed on record and
 * whether a new pass would be recorded.
 */
export type ExamStatus =
  { signedIn: false } | { signedIn: true; solved: ExamProblemKind[]; eligible: boolean };
