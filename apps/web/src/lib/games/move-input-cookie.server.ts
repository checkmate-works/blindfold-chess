import 'server-only';

import type { MoveInputPreferenceHint } from './move-input-cookie';
import { MOVE_INPUT_COOKIE_NAME, parseMoveInputCookie } from './move-input-cookie';
import { readPreferenceCookie } from './preference-cookie.server';

/**
 * Read the move-input preference hint cookie from the current request. Used
 * by `/games/play/page.tsx` so the SSR pipeline can render the correctly
 * shaped `MoveInputSkeleton` for returning users whose preferred mode is
 * `'text'` or `'select'`.
 *
 * @design Calling this function is an explicit opt-out from ISR. The cookie
 * is a per-user hint, so any page that reads it must be dynamic. The reader
 * is isolated to `/games/play` (via `dynamic = 'force-dynamic'` on that
 * page) — other `/games/*` routes keep ISR. See
 * `apps/web/src/lib/isr-user-scope-guard.test.ts` for the repo-wide rule.
 */
export async function readMoveInputPreferenceFromCookies(): Promise<MoveInputPreferenceHint> {
  return readPreferenceCookie(MOVE_INPUT_COOKIE_NAME, parseMoveInputCookie);
}
