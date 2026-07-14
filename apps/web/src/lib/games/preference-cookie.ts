import { IS_LOCAL_DEV } from '@/config';

/**
 * Shared lifetime for UI preference hint cookies (`bfc_move_input_pref`,
 * `bfc_board_visibility_pref`): long enough to be useful, self-correcting on
 * every preference update.
 */
export const PREFERENCE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

/**
 * Write a UI preference hint cookie from a client component with the shared
 * attribute set: `Path=/` (set and read across routes), 1-year `Max-Age`,
 * `SameSite=Lax`, `Secure` in prod (unset over local `http://`), and no
 * `HttpOnly` (the client mirror writes it via `document.cookie`).
 *
 * No-op on the server (`typeof document === 'undefined'`).
 */
export function writePreferenceCookieClient(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const secureFlag = !IS_LOCAL_DEV ? '; Secure' : '';
  document.cookie = `${name}=${value}; Path=/; Max-Age=${PREFERENCE_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secureFlag}`;
}
