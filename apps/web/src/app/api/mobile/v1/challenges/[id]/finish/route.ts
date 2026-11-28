import { finishAttemptForUser } from '@/lib/challenge/finish-response';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  type ChallengeResultSummary,
  getChallengeResultSummary,
} from '@/lib/mobile-api/challenge-result-summary';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Finishes a recorded challenge — the web's `finishChallengeAttempt`:
 * `pending` (ask again after `remainingMs`), a recorded result with the
 * ranks it granted, or `not_recorded`. Idempotent.
 *
 * A recorded result also carries `summary`: the EXP the run earned and the
 * player's record against it, which the web's result page reads on the
 * server from its `?grant=` param. The app has no second request to make
 * for them, so they ride on the answer that names the result. A failure to
 * read them answers `summary: null` rather than failing the finish: the run
 * is recorded either way, and a failed finish would be resent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMobileErrors('challenges/finish', async () => {
    const auth = await authorizeMobileRequest(request, {
      rateLimit: RATE_LIMITS.finishChallengeAttempt,
    });
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const result = await finishAttemptForUser(auth.user.id, id);
    if (result.status !== 'done' || !result.success) return mobileJson(result);
    return mobileJson({
      ...result,
      summary: await readSummary(auth.user.id, result.challengeResultId),
    });
  });
}

async function readSummary(
  userId: string,
  challengeResultId: string
): Promise<ChallengeResultSummary | null> {
  try {
    return (await getChallengeResultSummary(userId, challengeResultId)) ?? null;
  } catch (error) {
    console.error('[mobile finish] summary read failed:', error);
    return null;
  }
}

export const OPTIONS = mobilePreflight;
