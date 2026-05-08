import { IS_LOCAL_DEV } from '@/config';

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
 * `showBoardButtonInGame`) so the Server Component pipeline can render the
 * correct skeleton shape on the very first paint of `/games/play`.
 *
 * @design Why a cookie (and not rely on localStorage alone):
 * `GamePreferencesContext` reads `localStorage` inside a client `useEffect`,
 * which by definition only runs AFTER hydration. For users whose preferred
 * `peekMode` is `'inline'`, that delay means the server + pre-hydration
 * render omits the ~46 px `InlineBoardView` header and the hydrated layout
 * pushes the rest of the column down — a visible CLS. The same applies to
 * users who disabled `showBoardButtonInGame`: the action-row skeleton
 * reserves a button that will not render after hydration.
 *
 * Mirroring the peek keys into a cookie lets the server read the preference
 * at request time and pick the right skeleton shape. localStorage remains the
 * source of truth for the full preferences object; the cookie carries ONLY
 * the two peek-related keys needed for the SSR hint.
 *
 * @design Keys mirrored:
 *   - `peekMode`               — whether the inline board header is reserved
 *   - `showBoardButtonInGame`  — whether the modal "Show Board" button is reserved
 * No other preference keys are mirrored — the cookie is a UI hint, not a sync
 * channel.
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
 */
export const PEEK_COOKIE_NAME = 'bfc_peek_pref';

export const PEEK_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

const PEEK_MODES = ['modal', 'inline'] as const;
export type PeekMode = (typeof PEEK_MODES)[number];

export type PeekPreferenceHint = {
  peekMode: PeekMode;
  showBoardButtonInGame: boolean;
};

/**
 * Shared source of truth for the default peek values. Both
 * `DEFAULT_PEEK_HINT` (this module) and `defaultPreferences` in
 * `GamePreferencesContext.tsx` derive from these constants so SSR hints
 * and client-side state can never drift apart. Change here = change both.
 */
export const DEFAULT_PEEK_MODE: PeekMode = 'modal';
export const DEFAULT_SHOW_BOARD_BUTTON_IN_GAME = true;

export const DEFAULT_PEEK_HINT: PeekPreferenceHint = {
  peekMode: DEFAULT_PEEK_MODE,
  showBoardButtonInGame: DEFAULT_SHOW_BOARD_BUTTON_IN_GAME,
};

/**
 * Encode the hint as a compact cookie value: `<peekMode>|<showBoardButtonInGame>`.
 * e.g. `'inline|1'`. Chosen over JSON so the cookie stays small (no
 * URL-encoding of braces/quotes) and so the parser can't throw on untrusted
 * inputs. The boolean is encoded as `1` / `0` to keep the representation tiny
 * and unambiguous.
 */
export function encodePeekCookie(hint: PeekPreferenceHint): string {
  return `${hint.peekMode}|${hint.showBoardButtonInGame ? '1' : '0'}`;
}

function isPeekMode(value: string): value is PeekMode {
  return (PEEK_MODES as readonly string[]).includes(value);
}

/**
 * Parse the cookie value defensively. Unknown modes, malformed boolean
 * tokens, or malformed strings fall back to the default hint. Accepts only
 * the exact tokens `1` / `0` for the boolean — any other value is treated
 * as malformed so the SSR hint always reflects a self-consistent state
 * (matching `GamePreferencesContext`'s localStorage reconciliation).
 */
export function parsePeekCookie(raw: string | null | undefined): PeekPreferenceHint {
  if (!raw) return DEFAULT_PEEK_HINT;

  const [peekModeRaw, showBoardButtonRaw] = raw.split('|');
  if (!peekModeRaw || !isPeekMode(peekModeRaw)) return DEFAULT_PEEK_HINT;

  let showBoardButtonInGame: boolean;
  if (showBoardButtonRaw === '1') {
    showBoardButtonInGame = true;
  } else if (showBoardButtonRaw === '0') {
    showBoardButtonInGame = false;
  } else {
    return DEFAULT_PEEK_HINT;
  }

  return { peekMode: peekModeRaw, showBoardButtonInGame };
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
