import { IS_LOCAL_DEV } from '@/config';

import type { BoardVisibility } from './board-visibility';
import { DEFAULT_BOARD_VISIBILITY, isBoardVisibility } from './board-visibility';

/**
 * Cookie that mirrors the user's GLOBAL `boardVisibility` preference so the
 * Server Component pipeline can reserve the correct board skeleton on the very
 * first paint of `/games/play`.
 *
 * @design Why a cookie (same rationale as `bfc_move_input_pref`):
 * `boardVisibility` lives in `localStorage`, only readable after hydration.
 * The `'never'` (pure blindfold) layout renders NO board — just a compact
 * `h-16` bar — whereas `'always'` / `'peek'` render a full-size board card.
 * Without a server-readable hint, SSR always reserves the full board, then a
 * `'never'` user's hydration collapses it to ~64px — a large CLS. Mirroring
 * the value into a cookie lets the server pick the compact skeleton up front.
 *
 * Carries a single value: the board visibility to reserve for the NEXT
 * /games/play paint — a UI sizing hint, not a sync channel. localStorage
 * remains the source of truth.
 *
 * Two cooperating writers (both client-side):
 *   - `GamePreferencesProvider` seeds the GLOBAL default (on load / change /
 *     reset), so a first-ever visit reserves the right shape for a new game.
 *   - `PlayClient` refines it to the loaded game's EFFECTIVE value (per-game
 *     merged), so resuming a game whose per-game visibility differs from the
 *     global setting reserves the correct shape. Because PlayClient writes
 *     after the game loads, it is the last word while on the play page.
 * A game opened for the very first time may still shift once (the cookie holds
 * the prior value until PlayClient writes); it self-corrects on the next load.
 *
 * Attributes mirror `MOVE_INPUT_COOKIE_NAME`: `Path=/`, 1-year `Max-Age`,
 * `SameSite=Lax`, `Secure` in prod, no `HttpOnly` (the client mirror writes it).
 * If the cookie is cleared externally, SSR falls back to
 * `DEFAULT_BOARD_VISIBILITY` (full-board skeleton) — graceful degradation.
 */
export const BOARD_VISIBILITY_COOKIE_NAME = 'bfc_board_visibility_pref';

const BOARD_VISIBILITY_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

/**
 * Parse the cookie value defensively. Unknown / malformed values fall back to
 * {@link DEFAULT_BOARD_VISIBILITY}, matching `GamePreferencesContext`'s own
 * localStorage reconciliation.
 */
export function parseBoardVisibilityCookie(raw: string | null | undefined): BoardVisibility {
  return isBoardVisibility(raw) ? raw : DEFAULT_BOARD_VISIBILITY;
}

/**
 * Write the cookie from a client component. Used by `GamePreferencesContext`
 * so changes propagate to the SSR hint on the next navigation. No-op on the
 * server (`typeof document === 'undefined'`).
 */
export function writeBoardVisibilityCookieClient(value: BoardVisibility): void {
  if (typeof document === 'undefined') return;
  const secureFlag = !IS_LOCAL_DEV ? '; Secure' : '';
  document.cookie = `${BOARD_VISIBILITY_COOKIE_NAME}=${value}; Path=/; Max-Age=${BOARD_VISIBILITY_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secureFlag}`;
}
