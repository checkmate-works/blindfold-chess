import { finishAttemptForUser } from '@/lib/challenge/finish-response';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Finishes a recorded challenge — the web's `finishChallengeAttempt`:
 * `pending` (ask again after `remainingMs`), a recorded result with the
 * ranks it granted, or `not_recorded`. Idempotent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMobileErrors('challenges/finish', async () => {
    const auth = await authorizeMobileRequest(request, {
      rateLimit: RATE_LIMITS.finishChallengeAttempt,
    });
    if (!auth.ok) return auth.response;
    const { id } = await params;
    return mobileJson(await finishAttemptForUser(auth.user.id, id));
  });
}

export const OPTIONS = mobilePreflight;
