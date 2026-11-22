import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  readJsonBody,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createProfileForUser } from '@/lib/users/create-profile';

/**
 * Sets the signed-in user's username (`{ username }`), once — the app's
 * counterpart of the web's `/mypage/setup-username`. Same validation, name
 * filters and rate limit (`createProfileForUser`); the error codes are the
 * web form's (`username_taken`, `username_invalid_chars`, …) with status 422.
 */
export async function POST(request: Request) {
  return withMobileErrors('username', async () => {
    const auth = await authorizeMobileRequest(request, { rateLimit: RATE_LIMITS.setupUsername });
    if (!auth.ok) return auth.response;
    const body = await readJsonBody(request);
    const username =
      typeof body === 'object' && body !== null && 'username' in body
        ? String((body as { username: unknown }).username)
        : undefined;
    const result = await createProfileForUser(auth.user.id, { username });
    if ('error' in result) return mobileError(result.error, 422);
    return mobileJson({ success: true });
  });
}

export const OPTIONS = mobilePreflight;
