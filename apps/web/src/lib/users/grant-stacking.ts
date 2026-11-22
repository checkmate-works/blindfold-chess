/**
 * Where a new additive grant begins: at the end of the benefit the user
 * already holds when that end is still in the future, otherwise now. This is
 * what makes grants of the same benefit extend one another instead of
 * overlapping.
 *
 * Used by the admin grant path (`calcGrantStartsAt`). The one-off conversion
 * of leftover coin balances into ad-free days
 * (`scripts/retire-coins/convert-balances.sql`) restates the same rule in
 * SQL; the two must agree, or they would start the same user's next window
 * at different times.
 *
 * Kept in a module with no imports so it can be used without loading
 * `user-grants`, whose module body builds a cached DB query.
 */
export function stackGrantStart(latestExpiresAt: Date | null | undefined, now: Date): Date {
  return latestExpiresAt && latestExpiresAt > now ? latestExpiresAt : now;
}
