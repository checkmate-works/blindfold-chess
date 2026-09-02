/**
 * The subscription-status vocabulary and the predicates derived from it.
 *
 * This module must stay free of `server-only`, `@/lib/db`, and drizzle: the
 * /mypage subscription card is a Client Component and answers the same
 * questions about the row it was handed. Anything that needs the database
 * belongs in `subscription.ts` instead.
 */

/** Statuses that grant active subscriber benefits (e.g., ad-free). */
export const BENEFIT_ACTIVE_STATUSES = ['active', 'trialing'] as const;

/** Statuses that indicate a displayable (non-terminal) subscription. */
export const DISPLAYABLE_STATUSES = ['active', 'trialing', 'past_due'] as const;

/**
 * True when a mirrored subscription row currently grants subscriber benefits.
 *
 * Use this for every in-memory check on a fetched row. Queries that decide
 * which rows to fetch cannot call it — a predicate over a JavaScript object
 * does not compile to SQL — so they filter on {@link BENEFIT_ACTIVE_STATUSES}
 * with drizzle's `inArray` instead. Those two forms are the same rule written
 * twice; widening the status list must keep them in step.
 *
 * ## Why `currentPeriodEnd` is not part of the test
 * The row also carries the period Stripe last told us about, and it is
 * tempting to require that the period still covers now. It is left out
 * deliberately:
 *
 * - Both columns are maintained by the same webhook stream. At renewal the new
 *   period arrives in the same `customer.subscription.updated` event that would
 *   have moved the status, so a period end that has only just slipped into the
 *   past means "we have not processed the renewal yet", not "this user stopped
 *   paying". Requiring `currentPeriodEnd > now` turns webhook delivery lag into
 *   a benefit outage for a paying subscriber.
 * - Ad suppression is decided by `hasActiveSubscription`, a cached SQL
 *   existence check keyed by user and invalidated by cache tag, never by the
 *   clock. It cannot honestly evaluate a time-dependent term: the answer would
 *   freeze at cache-fill time and stay wrong until something revalidated the
 *   tag. So a stricter rule applied only in memory would let /mypage/benefits
 *   report that ads are back while ads are in fact still suppressed.
 *
 * A scheduled cancellation is a separate question — see
 * {@link isCancellationScheduled}. A subscription with one pending is still
 * active until Stripe actually terminates it.
 */
export function isSubscriptionActive(subscription: { status: string }): boolean {
  return (BENEFIT_ACTIVE_STATUSES as readonly string[]).includes(subscription.status);
}

/**
 * True when the subscription is set to terminate at a known point rather than
 * renew. Stripe fills `cancelAt` in when a user cancels through the customer
 * portal, so this is "cancellation pending", not "cancellation happened":
 * both writers of a terminated row clear the column, and a row that has
 * already reached `canceled` reports false here.
 *
 * Deliberately independent of {@link isSubscriptionActive}. A subscriber who
 * cancelled mid-period keeps their benefits until the period ends, so the two
 * are true at the same time and the UI shows "canceling" over an active plan.
 */
export function isCancellationScheduled(subscription: { cancelAt: Date | null }): boolean {
  return subscription.cancelAt !== null;
}
