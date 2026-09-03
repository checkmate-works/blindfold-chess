/**
 * Path of the full results list, locale-less (the locale-aware `Link` adds
 * the prefix; callers using the plain router prepend it themselves).
 *
 * `key` without `menu` is meaningless and dropped. `menu` without `key` is
 * allowed: the results page then resolves the key from the player's most
 * recent record for that menu.
 */
export function buildResultsPath(menu?: string, key?: string): string {
  const params = new URLSearchParams();
  if (menu) {
    params.set('menu', menu);
    if (key) params.set('key', key);
  }
  const qs = params.toString();
  return `/mypage/challenges/results${qs ? `?${qs}` : ''}`;
}
