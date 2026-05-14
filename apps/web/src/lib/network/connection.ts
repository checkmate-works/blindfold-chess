/**
 * Network Information API helper for "should we warn before a large
 * download?" decisions. The API is widely supported in Chromium-based
 * browsers but absent from Firefox and Safari, so this module is built
 * around graceful degradation:
 *
 *   - If we can determine the user is on Wi-Fi / ethernet with a fast
 *     effective type and Data Saver is off → do not bother them.
 *   - If anything is uncertain (API unavailable, slow link, cellular,
 *     Data Saver on, ...) → ask first.
 *
 * Used by the "Maia model is 46 MB" consent flow. Reusable for any
 * future large-asset download.
 *
 * Spec: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */

/**
 * Subset of `NetworkInformation` we actually consult. The full DOM type
 * exists in newer lib.dom.d.ts releases but is missing from older ones
 * and unset in our project's `@types/...` versions, so we define just
 * the fields we touch.
 */
type NetworkInformationSlice = {
  readonly type?: string;
  readonly effectiveType?: string;
  readonly saveData?: boolean;
};

/**
 * Slow `effectiveType` values per the Network Information spec. Anything
 * at or below `'3g'` is treated as a likely-metered / likely-painful
 * download path.
 */
const SLOW_EFFECTIVE_TYPES = new Set<string>(['slow-2g', '2g', '3g']);

function getConnection(): NetworkInformationSlice | undefined {
  if (typeof navigator === 'undefined') return undefined;
  // `connection` is not part of the standard Navigator type yet; many
  // engines also expose vendor-prefixed mirrors.
  const nav = navigator as Navigator & {
    connection?: NetworkInformationSlice;
    mozConnection?: NetworkInformationSlice;
    webkitConnection?: NetworkInformationSlice;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

/**
 * Snapshot of the user's current connection state, normalised across
 * browsers. Returned fields:
 *
 *   - `available`: true iff the Network Information API is exposed at
 *     all. When false, the other fields are undefined and callers should
 *     fall back to "ask for consent to be safe".
 *   - `type`: physical link type when reported (`'wifi'`, `'cellular'`,
 *     `'ethernet'`, ...). Many browsers omit this even when the API is
 *     otherwise available.
 *   - `effectiveType`: speed bucket (`'4g'`, `'3g'`, `'2g'`, `'slow-2g'`).
 *   - `saveData`: true if the user has Data Saver / Lite mode on.
 */
export type ConnectionSnapshot = Readonly<{
  available: boolean;
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
}>;

export function getConnectionSnapshot(): ConnectionSnapshot {
  const conn = getConnection();
  if (!conn) return { available: false };
  return {
    available: true,
    type: conn.type,
    effectiveType: conn.effectiveType,
    saveData: conn.saveData,
  };
}

/**
 * "Should we ask before pulling a 10s-of-MB asset?" decision.
 *
 * Returns true when:
 *   - The Network Information API is unavailable (we can't tell, so be
 *     conservative — Firefox and Safari hit this branch).
 *   - The link reports `type === 'cellular'`.
 *   - The effective speed is in {2g, 3g, slow-2g}.
 *   - The user has Data Saver enabled.
 *
 * Otherwise returns false — Wi-Fi / ethernet / 4g+ with Data Saver off.
 */
export function shouldWarnBeforeLargeDownload(
  snapshot: ConnectionSnapshot = getConnectionSnapshot()
): boolean {
  if (!snapshot.available) return true;
  if (snapshot.saveData === true) return true;
  if (snapshot.type === 'cellular') return true;
  if (snapshot.effectiveType && SLOW_EFFECTIVE_TYPES.has(snapshot.effectiveType)) {
    return true;
  }
  return false;
}
