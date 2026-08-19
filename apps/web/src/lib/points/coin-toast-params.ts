/**
 * The query params that ask the next page to show a coin toast on arrival.
 *
 * Grants are awarded during a create + redirect, so the only channel to the
 * toast is the destination URL. `ToastContainer` reads `coinsEarned` and
 * `coinsCapped` off it, shows the matching toasts, and strips both. Four
 * create flows — position memory, puzzles, chunks, topic posts — wrote that
 * contract out by hand, which put the param names, the amount stringification
 * and the param order in four places for one reader to agree with.
 *
 * `fallbackToast` covers the flows whose plain "created" confirmation is only
 * shown when no coins were granted (the coin toast already confirms the
 * create). Flows that put their confirmation in the destination path itself
 * omit it.
 *
 * Returns an empty `URLSearchParams` when there is nothing to say — callers
 * should check `toString()` before appending. `pointGrant` is accepted as
 * either absent or null because the create flows disagree on which they
 * return for "no grant"; both mean the same thing here.
 */
export function buildCoinToastParams(
  grant: { pointGrant?: { amount: number } | null; coinCapped?: boolean },
  fallbackToast?: string
): URLSearchParams {
  const params = new URLSearchParams();
  if (grant.pointGrant) {
    params.set('coinsEarned', String(grant.pointGrant.amount));
  } else if (fallbackToast) {
    params.set('toast', fallbackToast);
  }
  if (grant.coinCapped) params.set('coinsCapped', '1');
  return params;
}
