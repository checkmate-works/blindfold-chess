import 'server-only';

import type { BoardVisibility } from './board-visibility';
import {
  BOARD_VISIBILITY_COOKIE_NAME,
  parseBoardVisibilityCookie,
} from './board-visibility-cookie';
import { readPreferenceCookie } from './preference-cookie.server';

/**
 * Read the board-visibility hint cookie from the current request. Used by
 * `/games/play` (page + loading) so the SSR pipeline can reserve the compact
 * board skeleton for `'never'`-mode users instead of the full-size board.
 *
 * Like the move-input reader, calling this is an explicit opt-out from ISR
 * (per-user cookie → dynamic). `/games/play` already declares
 * `dynamic = 'force-dynamic'`.
 */
export async function readBoardVisibilityFromCookies(): Promise<BoardVisibility> {
  return readPreferenceCookie(BOARD_VISIBILITY_COOKIE_NAME, parseBoardVisibilityCookie);
}
