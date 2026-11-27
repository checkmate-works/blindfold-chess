'use server';

import {
  examProblemKinds,
  examRankOf,
  examStepKey,
  isExamEligible,
} from '@blindfold-chess/features/dojo-journey';

import { getOptionalUser } from '@/lib/auth';
import { resolveHighestAchievedSlug } from '@/lib/dojo/rank-progression';
import { getAchievedSlugsForUser } from '@/lib/dojo/rank-queries';
import { getCompletedSteps } from '@/lib/dojo/step-completions';

import type { ExamStatus } from '../_lib/types';

/**
 * The viewer's standing on a rank's exam, read after hydration so the
 * prerendered problem list stays free of per-user data. An unknown rank, or
 * one without an exam, reads as nothing solved and nothing recordable.
 */
export async function getExamStatus(rank: string): Promise<ExamStatus> {
  const user = await getOptionalUser();
  if (!user) return { signedIn: false };

  const exam = examRankOf(rank);
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
