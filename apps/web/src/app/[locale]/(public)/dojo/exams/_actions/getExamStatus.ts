'use server';

import { examStepKey, isExamEligible } from '@blindfold-chess/features/dojo-journey';

import { getOptionalUser } from '@/lib/auth';
import { getCompletedSteps } from '@/lib/dojo/step-completions';

import { getAchievedSlugsForUser } from '@/app/[locale]/(public)/dojo/ranks/_lib/queries';
import { resolveHighestAchievedSlug } from '@/app/[locale]/(public)/dojo/ranks/_lib/rank-progression';

import { examProblemKinds, parseExamRank } from '../_lib/exam-rank';
import type { ExamStatus } from '../_lib/types';

/**
 * The viewer's standing on a rank's exam, read after hydration so the
 * prerendered problem list stays free of per-user data. An unknown rank, or
 * one without an exam, reads as nothing solved and nothing recordable.
 */
export async function getExamStatus(rank: string): Promise<ExamStatus> {
  const user = await getOptionalUser();
  if (!user) return { signedIn: false };

  const exam = parseExamRank(rank);
  if (!exam) return { signedIn: true, solved: [], eligible: false };

  const [completed, achieved] = await Promise.all([
    getCompletedSteps(user.id),
    getAchievedSlugsForUser(user.id),
  ]);
  const completedSet = new Set(completed);
  const solved = examProblemKinds(exam).filter((kind) => completedSet.has(examStepKey(exam, kind)));
  const eligible = isExamEligible(exam, resolveHighestAchievedSlug(achieved) ?? undefined);
  return { signedIn: true, solved, eligible };
}
