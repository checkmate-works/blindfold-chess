import { beginChallengeAttempt } from '@/lib/challenge/attempts';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  readJsonBody,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Starts a recorded challenge (`{ menuType, settings }`) — the app's
 * counterpart of the web's `beginChallengeAttempt` action, on the same core:
 * the server parses the settings, generates and stores every question, and
 * starts its clock after the countdown. Answers `{ attemptId, first }`; 422
 * `invalid_menu_type` / `invalid_settings`.
 */
export async function POST(request: Request) {
  return withMobileErrors('challenges', async () => {
    const auth = await authorizeMobileRequest(request, {
      rateLimit: RATE_LIMITS.beginChallengeAttempt,
    });
    if (!auth.ok) return auth.response;
    const body = (await readJsonBody(request)) as
      { menuType?: unknown; settings?: unknown } | undefined;
    const result = await beginChallengeAttempt({
      userId: auth.user.id,
      menuType: body?.menuType,
      rawSettings: body?.settings,
    });
    if (!result.ok) return mobileError(result.error, 422);
    return mobileJson({ attemptId: result.attemptId, first: result.first });
  });
}

export const OPTIONS = mobilePreflight;
