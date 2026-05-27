import { IS_LOCAL_DEV } from '@/config';

import type { BoardVisibility } from './board-visibility';
import { DEFAULT_BOARD_VISIBILITY, isBoardVisibility } from './board-visibility';

/**
 * Single-writer rule: only `GamePreferencesProvider` writes this cookie (via
 * `writePeekPreferenceCookie`, called synchronously from the initial-load
 * effect, `updatePreferences`, and `resetPreferences`). Any additional writer
 * will cause drift with the localStorage source of truth. If the cookie is
 * cleared (privacy extensions, incognito, storage wipes, etc.) SSR falls back
 * to `DEFAULT_PEEK_HINT` until the user next changes a peek-related
 * preference — acceptable graceful degradation, behavior reverts to today's
 * baseline (default skeleton), not worse.
 */

/**
 * Cookie that mirrors the user's board-peek preferences (`peekMode` and
 * `boardVisibility`) so the Server Component pipeline can render the
 * correct skeleton shape on the very first paint of `/games/play`.
 *
 * @design Why a cookie (and not rely on localStorage alone):
 * `GamePreferencesContext` reads `localStorage` inside a client `useEffect`,
 * which by definition only runs AFTER hydration. For users whose preferred
 * `peekMode` is `'inline'`, that delay means the server + pre-hydration
 * render omits the ~46 px `InlineBoardView` header and the hydrated layout
 * pushes the rest of the column down — a visible CLS. The same applies to
 * users whose `boardVisibility` differs from the default: the action-row
 * skeleton may reserve a button that will not render after hydration, or
 * vice versa.
 *
 * Mirroring the peek keys into a cookie lets the server read the preference
 * at request time and pick the right skeleton shape. localStorage remains the
 * source of truth for the full preferences object; the cookie carries ONLY
 * the two peek-related keys needed for the SSR hint.
 *
 * @design Keys mirrored:
 *   - `peekMode`         — whether the inline board header is reserved
 *   - `boardVisibility`  — whether (and how) the board is surfaced at all
 * No other preference keys are mirrored — the cookie is a UI hint, not a
 * sync channel.
 *
 * @design Attributes:
 *   - `Path=/`           — available on every route (the cookie is set and
 *                          read across routes, e.g., updated on
 *                          `/preferences` but read on `/games/play`).
 *   - `Max-Age=1 year`   — UI preferences should survive long enough to be
 *                          useful; the cookie is self-correcting on every
 *                          preference update.
 *   - `SameSite=Lax`     — default-safe for a non-auth cookie; travels on
 *                          top-level navigations.
 *   - `Secure`           — set in production, unset over local `http://`.
 *   - No `HttpOnly`      — the client mirror writes the cookie from
 *                          `document.cookie`, so it must be JS-readable.
 *
 * @design Wire-format migration:
 * The encoded value used to be `<peekMode>|<0|1>` where the trailing token
 * was the legacy boolean `showBoardButtonInGame`. After the
 * `boardVisibility` rename the encoder emits `<peekMode>|<boardVisibility>`
 * (e.g. `'inline|always'`). The decoder accepts both shapes — `'0'` and
 * `'1'` are mapped to `'never'` and `'peek'` respectively, matching
 * `legacyToBoardVisibility` in `board-visibility.ts`. Cookies written by
 * the new code overwrite the old format on the next preference update,
 * so the legacy decode path is purely transitional.
 */
export const PEEK_COOKIE_NAME = 'bfc_peek_pref';

export const PEEK_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

const PEEK_MODES = ['modal', 'inline'] as const;
export type PeekMode = (typeof PEEK_MODES)[number];

export type PeekPreferenceHint = {
  peekMode: PeekMode;
  boardVisibility: BoardVisibility;
};

/**
 * Shared source of truth for the default peek values. Both
 * `DEFAULT_PEEK_HINT` (this module) and `defaultPreferences` in
 * `GamePreferencesContext.tsx` derive from these constants so SSR hints
 * and client-side state can never drift apart. Change here = change both.
 */
export const DEFAULT_PEEK_MODE: PeekMode = 'modal';

export const DEFAULT_PEEK_HINT: PeekPreferenceHint = {
  peekMode: DEFAULT_PEEK_MODE,
  boardVisibility: DEFAULT_BOARD_VISIBILITY,
};

/**
 * Encode the hint as a compact cookie value: `<peekMode>|<boardVisibility>`.
 * e.g. `'inline|always'`. Chosen over JSON so the cookie stays small (no
 * URL-encoding of braces/quotes) and so the parser can't throw on untrusted
 * inputs.
 */
export function encodePeekCookie(hint: PeekPreferenceHint): string {
  return `${hint.peekMode}|${hint.boardVisibility}`;
}

function isPeekMode(value: string): value is PeekMode {
  return (PEEK_MODES as readonly string[]).includes(value);
}

/**
 * Parse the cookie value defensively. Unknown modes, malformed tokens, or
 * malformed strings fall back to the default hint. Accepts BOTH the new
 * `<peekMode>|<boardVisibility>` and the legacy `<peekMode>|<0|1>` shape;
 * the latter is mapped via {@link legacyToBoardVisibility} so cookies
 * written by older code keep working until the next preference update
 * rewrites the cookie in the new format.
 */
export function parsePeekCookie(raw: string | null | undefined): PeekPreferenceHint {
  if (!raw) return DEFAULT_PEEK_HINT;

  const [peekModeRaw, visibilityRaw] = raw.split('|');
  if (!peekModeRaw || !isPeekMode(peekModeRaw)) return DEFAULT_PEEK_HINT;

  let boardVisibility: BoardVisibility;
  if (visibilityRaw === '1') {
    // Legacy: showBoardButtonInGame=true → 'peek'
    boardVisibility = 'peek';
  } else if (visibilityRaw === '0') {
    // Legacy: showBoardButtonInGame=false → 'never'
    boardVisibility = 'never';
  } else if (isBoardVisibility(visibilityRaw)) {
    boardVisibility = visibilityRaw;
  } else {
    return DEFAULT_PEEK_HINT;
  }

  return { peekMode: peekModeRaw, boardVisibility };
}

/**
 * Write the cookie from a client component. Used by `GamePreferencesContext`
 * so that changes made via the Preferences UI (or anywhere else) propagate
 * to the SSR hint on the next navigation.
 *
 * No-op on the server (typeof document === 'undefined').
 */
export function writePeekPreferenceCookie(hint: PeekPreferenceHint): void {
  if (typeof document === 'undefined') return;
  const value = encodePeekCookie(hint);
  const secureFlag = !IS_LOCAL_DEV ? '; Secure' : '';
  document.cookie = `${PEEK_COOKIE_NAME}=${value}; Path=/; Max-Age=${PEEK_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secureFlag}`;
}
