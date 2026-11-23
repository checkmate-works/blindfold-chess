/**
 * Where a new additive grant begins: at the end of the benefit the user
 * already holds when that end is still in the future, otherwise now. This is
 * what makes grants of the same benefit extend one another instead of
 * overlapping.
 *
 * Used by the admin grant path (`calcGrantStartsAt`). The ad-free grants
 * issued when leftover coin balances were converted in 2026-11
 * (`grant_type = 'point_redemption'`) were stacked by the same rule.
 *
 * Kept in a module with no imports so it can be used without loading
 * `user-grants`, whose module body builds a cached DB query.
 */
export function stackGrantStart(latestExpiresAt: Date | null | undefined, now: Date): Date {
  return latestExpiresAt && latestExpiresAt > now ? latestExpiresAt : now;
}
