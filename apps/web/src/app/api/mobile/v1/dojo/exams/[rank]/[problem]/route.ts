import { examProblemKindFromSegment } from '@blindfold-chess/features/dojo-journey';
import type { MobileDojoExamResponse } from '@blindfold-chess/features/dojo-journey';

import { evaluateRanksAfterCreate } from '@/lib/db/rank-evaluation';
import { submitExamProblem } from '@/lib/dojo/exam';
import { resolveHighestAchievedSlug } from '@/lib/dojo/rank-progression';
import { getAchievedSlugsForUser } from '@/lib/dojo/rank-queries';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  readJsonBody,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Grades the app user's answer to one exam problem — `{ fen }` (the
 * recreated position) for `position-memory`, `{ moves }` (the player's own
 * moves in SAN) for `puzzle` — and answers `MobileDojoExamResponse`.
 *
 * @description
 * The server grades; the app never sends a verdict. `submitExamProblem`
 * records a pass only for a player whose next rank is the exam's rank or who
 * already holds it (otherwise `recorded: false`: graded as practice). The
 * rank itself is granted by the ordinary evaluation run here afterwards, once
 * every problem of the exam has been recorded; `grantedRanks` are the ranks
 * this request earned and `highestRank` the player's highest rank after it.
 * The user is the token's; the body names no user.
 *
 * - 404 `unknownExam` — the rank has no exam or the problem is unknown.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ rank: string; problem: string }> }
) {
  return withMobileErrors('dojo/exams', async () => {
    const auth = await authorizeMobileRequest(request, { rateLimit: RATE_LIMITS.dojoExam });
    if (!auth.ok) return auth.response;
    const { rank, problem: segment } = await params;
    // Kebab-case segments only (`position-memory`), so each problem has one URL.
    const problem = examProblemKindFromSegment(segment);
    if (!problem) return mobileError('unknownExam', 404);

    const answer = await readJsonBody(request);
    const result = await submitExamProblem(auth.user.id, rank, problem, answer);
    if (result.status === 'unknownExam') return mobileError('unknownExam', 404);

    const granted = await evaluateRanksAfterCreate(auth.user.id, 'dojo exam');
    const highest = resolveHighestAchievedSlug(await getAchievedSlugsForUser(auth.user.id));
    const response: MobileDojoExamResponse = {
      passed: result.passed,
      accuracy: result.accuracy,
      recorded: result.recorded,
      grantedRanks: granted.map((grantedRank) => grantedRank.slug),
      highestRank: highest,
    };
    return mobileJson(response);
  });
}

export const OPTIONS = mobilePreflight;
