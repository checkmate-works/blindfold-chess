import { answerChallengeAttempt } from '@/lib/challenge/attempts';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  mobileJson,
  mobilePreflight,
  readJsonBody,
  withMobileErrors,
} from '@/lib/mobile-api/response';

/**
 * Answers one question of a recorded challenge (`{ sequence, answer }`) and
 * returns the server's grading (`accepted` with `correct` and the next
 * question, `expired`, or `rejected`) — the web's `answerChallengeAttempt`.
 * The receipt time is taken before anything else, as there. No rate limit,
 * as on the web: answers are bounded by the attempt's own rules. Resending
 * the same answer replays the same response, so the app may retry freely.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const receivedAt = Date.now();
  return withMobileErrors('challenges/answers', async () => {
    const auth = await authorizeMobileRequest(request);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = (await readJsonBody(request)) as
      { sequence?: unknown; answer?: unknown } | undefined;
    const response = await answerChallengeAttempt({
      userId: auth.user.id,
      attemptId: id,
      sequence: body?.sequence,
      rawAnswer: body?.answer,
      receivedAt,
    });
    return mobileJson(response);
  });
}

export const OPTIONS = mobilePreflight;
