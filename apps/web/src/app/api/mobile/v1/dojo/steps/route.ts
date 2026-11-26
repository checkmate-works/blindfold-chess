import { DOJO_STEPS_MAX } from '@blindfold-chess/features/dojo-journey';
import type { MobileDojoStepsResponse } from '@blindfold-chess/features/dojo-journey';

import { recordGuideSteps } from '@/lib/dojo/step-completions';
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
 * Records the guide pages the app's user has read (`{ steps: string[] }`,
 * 1 to `DOJO_STEPS_MAX` keys) and answers `{ completed, rejected }`.
 *
 * @description
 * Only `guide:<rank>:<page>` keys are taken. An `exam:` key is always
 * `rejected`: an exam pass is evidence for a rank, so only the exam route
 * writes one, after grading the answer on the server — accepting it here
 * would let anyone earn a rank by calling this endpoint. Keys recorded
 * before come back in `completed` again, so the app may resend after a lost
 * response. The user is the token's; the body names no user.
 *
 * - 400 `invalidRequest` — `steps` is not an array, is empty, or has more
 *   than `DOJO_STEPS_MAX` entries.
 */
export async function POST(request: Request) {
  return withMobileErrors('dojo/steps', async () => {
    const auth = await authorizeMobileRequest(request, { rateLimit: RATE_LIMITS.dojoStep });
    if (!auth.ok) return auth.response;
    const body = (await readJsonBody(request)) as { steps?: unknown } | null | undefined;
    const steps = body?.steps;
    if (!Array.isArray(steps) || steps.length === 0 || steps.length > DOJO_STEPS_MAX) {
      return mobileError('invalidRequest', 400);
    }
    const response: MobileDojoStepsResponse = await recordGuideSteps(auth.user.id, steps);
    return mobileJson(response);
  });
}

export const OPTIONS = mobilePreflight;
