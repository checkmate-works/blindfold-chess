import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  mobileJson,
  mobilePreflight,
  readJsonBody,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { savePuzzleResultForUser } from '@/lib/positions/puzzle-result';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Records a solved puzzle (`{ playerMoveCount, incorrectAttempts,
 * peekCount }`) for the signed-in user — the web's `savePuzzleResult`.
 */
export async function POST(request: Request) {
  return withMobileErrors('puzzles/results', async () => {
    const auth = await authorizeMobileRequest(request, {
      rateLimit: RATE_LIMITS.savePracticeResult,
    });
    if (!auth.ok) return auth.response;
    const body = (await readJsonBody(request)) as Record<string, unknown> | undefined;
    const num = (key: string) => (typeof body?.[key] === 'number' ? (body[key] as number) : 0);
    await savePuzzleResultForUser(auth.user.id, {
      playerMoveCount: num('playerMoveCount'),
      incorrectAttempts: num('incorrectAttempts'),
      peekCount: num('peekCount'),
    });
    return mobileJson({ success: true });
  });
}

export const OPTIONS = mobilePreflight;
