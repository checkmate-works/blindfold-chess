import { MOVE_INPUT_MODES, type MoveInputMode } from './move-input-modes';
import { writePreferenceCookieClient } from './preference-cookie';

/**
 * Single-writer rule: only `GamePreferencesProvider` writes this cookie (via
 * `writeMoveInputCookieClient`, called synchronously from the initial-load
 * effect, `updatePreferences`, and `resetPreferences`). Any additional writer
 * will cause drift with the localStorage source of truth. If the cookie is
 * cleared (privacy extensions, incognito, storage wipes, etc.) SSR falls back
 * to `DEFAULT_MOVE_INPUT_HINT` until the user next changes a mode-related
 * preference — acceptable graceful degradation, behavior reverts to today's
 * baseline (default skeleton), not worse.
 */

/**
 * Cookie that mirrors the user's move-input mode preference so the Server
 * Component pipeline can render the correct `MoveInputSkeleton` shape on the
 * very first paint of `/games/play`.
 *
 * @design Why a cookie (and not rely on localStorage alone):
 * `GamePreferencesContext` reads `localStorage` inside a client `useEffect`,
 * which by definition only runs AFTER hydration. For users whose preferred
 * `moveInputMode` is `'text'` or `'select'`, that delay means the server +
 * pre-hydration render always emits the default `'button'` skeleton (~288 px
 * tall), then the hydrated panel swaps in at 50–58 px — a visible CLS.
 *
 * Mirroring the mode keys into a cookie lets the server read the preference
 * at request time and pick the right skeleton shape. localStorage remains the
 * source of truth for the full preferences object; the cookie carries ONLY
 * the two mode-related keys needed for the SSR hint.
 *
 * @design Keys mirrored:
 *   - `moveInputMode`           — which input panel the real component will render
 *   - `enabledMoveInputModes`   — whether a mode-switcher row is reserved below
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
export const MOVE_INPUT_COOKIE_NAME = 'bfc_move_input_pref';

export type { MoveInputMode };

export type MoveInputPreferenceHint = {
  mode: MoveInputMode;
  enabledModes: MoveInputMode[];
};

/**
 * Shared source of truth for the default move-input mode values. Both
 * `DEFAULT_MOVE_INPUT_HINT` (this module) and `defaultPreferences` in
 * `GamePreferencesContext.tsx` derive from these constants so SSR hints
 * and client-side state can never drift apart. Change here = change both.
 */
export const DEFAULT_MOVE_INPUT_MODE: MoveInputMode = 'button';
export const DEFAULT_ENABLED_MOVE_INPUT_MODES: MoveInputMode[] = ['button'];

export const DEFAULT_MOVE_INPUT_HINT: MoveInputPreferenceHint = {
  mode: DEFAULT_MOVE_INPUT_MODE,
  enabledModes: DEFAULT_ENABLED_MOVE_INPUT_MODES,
};

/**
 * Encode the hint as a compact cookie value: `<mode>|<m1>,<m2>,...`.
 * e.g. `'text|text,button'`. Chosen over JSON so the cookie stays small
 * (no URL-encoding of braces/quotes) and so the parser can't throw on
 * untrusted inputs.
 */
export function encodeMoveInputCookie(hint: MoveInputPreferenceHint): string {
  const enabled = hint.enabledModes.length > 0 ? hint.enabledModes : [hint.mode];
  return `${hint.mode}|${enabled.join(',')}`;
}

function isMoveInputMode(value: string): value is MoveInputMode {
  return (MOVE_INPUT_MODES as readonly string[]).includes(value);
}

/**
 * Parse the cookie value defensively. Unknown modes, empty enabled lists,
 * or malformed strings fall back to the default hint. When the parsed
 * `mode` is not present in `enabledModes`, the mode is coerced to the first
 * enabled entry so the emitted skeleton always reflects a self-consistent
 * state (matching `GamePreferencesContext`'s localStorage reconciliation).
 */
export function parseMoveInputCookie(raw: string | null | undefined): MoveInputPreferenceHint {
  if (!raw) return DEFAULT_MOVE_INPUT_HINT;

  const [modeRaw, enabledRaw] = raw.split('|');
  if (!modeRaw || !isMoveInputMode(modeRaw)) return DEFAULT_MOVE_INPUT_HINT;

  const enabledModes =
    enabledRaw && enabledRaw.length > 0
      ? enabledRaw
          .split(',')
          .map((m) => m.trim())
          .filter(isMoveInputMode)
      : [modeRaw];

  if (enabledModes.length === 0) return DEFAULT_MOVE_INPUT_HINT;

  const mode = enabledModes.includes(modeRaw) ? modeRaw : enabledModes[0]!;
  return { mode, enabledModes };
}

/**
 * Write the cookie from a client component. Used by `GamePreferencesContext`
 * so that changes made via the Preferences UI (or anywhere else) propagate
 * to the SSR hint on the next navigation.
 *
 * No-op on the server (typeof document === 'undefined').
 */
export function writeMoveInputCookieClient(hint: MoveInputPreferenceHint): void {
  writePreferenceCookieClient(MOVE_INPUT_COOKIE_NAME, encodeMoveInputCookie(hint));
}
