import { saveAiGameResult } from '@/lib/db/save-game-result';
import { parseAiGameResultReport } from '@/lib/games/ai-game-result-input';
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
 * Grants Exp for a finished AI game played in the app (`{ gameId, result,
 * engine, playerMoveCount, aidedMoveCount }`) — the web's `saveGameResult`
 * action. The game itself stays on the device; the only thing recorded is
 * the grant, keyed by the game's id, so sending the same game again returns
 * the original grant.
 *
 * The app runs Stockfish only, so a Maia report is refused here rather than
 * granted at Maia's rate. A game with no player moves answers success with
 * no `exp` and writes nothing.
 */
export async function POST(request: Request) {
  return withMobileErrors('games/results', async () => {
    const auth = await authorizeMobileRequest(request, {
      rateLimit: RATE_LIMITS.saveGameResult,
    });
    if (!auth.ok) return auth.response;

    const report = parseAiGameResultReport(await readJsonBody(request));
    if (!report || report.engine.kind !== 'stockfish') {
      return mobileError('invalid_input', 400);
    }
    if (report.playerMoveCount === 0) {
      return mobileJson({ success: true });
    }

    const { exp } = await saveAiGameResult({ userId: auth.user.id, ...report });
    return mobileJson({ success: true, exp });
  });
}

export const OPTIONS = mobilePreflight;
