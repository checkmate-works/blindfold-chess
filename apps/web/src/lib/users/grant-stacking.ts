/**
 * Where a new additive grant begins: at the end of the benefit the user
 * already holds when that end is still in the future, otherwise now. This is
 * what makes grants of the same benefit extend one another instead of
 * overlapping.
 *
 * Shared by the admin grant path (`calcGrantStartsAt`) and the coin
 * redemption, which read the latest expiry with different queries (the
 * redemption locks the row inside its transaction) but must agree on the
 * rule — otherwise a coin purchase and an admin grant would start the same
 * user's next window at different times.
 *
 * Kept in a module with no imports so the redemption can use it without
 * loading `user-grants`, whose module body builds a cached DB query.
 */
export function stackGrantStart(latestExpiresAt: Date | null | undefined, now: Date): Date {
  return latestExpiresAt && latestExpiresAt > now ? latestExpiresAt : now;
}
