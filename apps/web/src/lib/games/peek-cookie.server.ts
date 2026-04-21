import { cookies } from 'next/headers';

import 'server-only';

import type { PeekPreferenceHint } from './peek-cookie';
import { PEEK_COOKIE_NAME, parsePeekCookie } from './peek-cookie';

/**
 * Read the board-peek preference hint cookie from the current request. Used
 * by `/games/play/page.tsx` so the SSR pipeline can render the correctly
 * shaped skeleton (inline board header vs modal "Show Board" button) for
 * returning users whose preferred `peekMode` is `'inline'` or who disabled
 * `showBoardButtonInGame`.
 *
 * @design Calling this function is an explicit opt-out from ISR. The cookie
 * is a per-user hint, so any page that reads it must be dynamic. The reader
 * is isolated to `/games/play` (via `dynamic = 'force-dynamic'` on that
 * page) — other `/games/*` routes keep ISR. See
 * `apps/web/src/lib/isr-user-scope-guard.test.ts` for the repo-wide rule.
 */
export async function readPeekPreferenceFromCookies(): Promise<PeekPreferenceHint> {
  const store = await cookies();
  const raw = store.get(PEEK_COOKIE_NAME)?.value ?? null;
  return parsePeekCookie(raw);
}
