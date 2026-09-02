import * as Sentry from '@sentry/nextjs';
import { and, eq, ne } from 'drizzle-orm';
import 'server-only';

import { getStripe } from '@/lib/billing/stripe';
import { db, subscriptions } from '@/lib/db';

/**
 * Immediately cancel every active Stripe subscription a user holds, used as
 * part of account deletion (退会). See {@link import('@/lib/users/delete-account').deleteAccount}
 * for the overall deletion flow and the policy behind it — including why this
 * runs first, before anything irreversible.
 *
 * ## Why immediate (not period-end) cancellation
 * The product decision is to cancel **immediately** (`stripe.subscriptions.cancel`),
 * not at period end, so a deleted account can never keep getting billed. No
 * proration / day-rate refund is issued — Stripe's default behaviour is fine.
 *
 * ## Idempotency
 * - Rows already at `status === 'canceled'` are skipped (no Stripe call).
 * - If Stripe reports the subscription is already gone (404 / `resource_missing`),
 *   that is treated as success and we still sync the local row.
 * - The local row is also written by the `customer.subscription.deleted`
 *   webhook, which `stripe.subscriptions.cancel()` always emits, so that write
 *   normally lands second. Both writers set exactly `status` → `canceled`,
 *   `cancelAt` → `null`, which is what makes the pair idempotent: whichever
 *   arrives last leaves the row in the same state.
 * - `cancelAt` is the timestamp at which a *scheduled* cancellation will take
 *   effect (Stripe sets it when a user cancels through the customer portal),
 *   not a record of when a cancellation was carried out. The subscription card
 *   on /mypage renders a non-null `cancelAt` as "cancellation pending, access
 *   until then". A subscription we have just terminated has nothing pending,
 *   so `null` is the correct value; writing `now` would leave a dead
 *   subscription displaying as forever about to cancel.
 *
 * ## Failure mode
 * A genuine Stripe failure (anything other than "already gone") is **rethrown**
 * so the caller can abort account deletion and surface a retryable error — we
 * must confirm billing has stopped before completing the deletion.
 */
export async function cancelAllActiveSubscriptions(userId: string): Promise<void> {
  // Fetch the user's not-already-canceled subscriptions. The vast majority of
  // users have none, in which case this is a no-op.
  const rows = await db
    .select({
      id: subscriptions.id,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), ne(subscriptions.status, 'canceled')));

  if (rows.length === 0) return;

  const stripe = getStripe();

  for (const row of rows) {
    // Defensive idempotency guard in addition to the SQL filter above.
    if (row.status === 'canceled') continue;

    try {
      await stripe.subscriptions.cancel(row.stripeSubscriptionId);
    } catch (err) {
      if (!isMissingSubscriptionError(err)) {
        // A real failure: abort. The caller turns this into a 500 and the user
        // can retry — we must not complete deletion while billing might continue.
        throw err;
      }
      // Already gone on Stripe's side: treat as success, fall through to DB sync.
      Sentry.captureMessage(
        `cancelAllActiveSubscriptions: Stripe subscription ${row.stripeSubscriptionId} already missing (user ${userId}); treating as canceled.`,
        'info'
      );
    }

    // Sync the local mirror inline rather than waiting on the webhook. These are
    // the same three columns and the same values `handleSubscriptionDeleted`
    // writes, so the two writes are interchangeable in either order.
    await db
      .update(subscriptions)
      .set({ status: 'canceled', cancelAt: null, updatedAt: new Date() })
      .where(eq(subscriptions.id, row.id));

    // Leave a trail for manual reconciliation (NOT activity_log — see OVERVIEW).
    console.info(
      `cancelAllActiveSubscriptions: canceled Stripe subscription ${row.stripeSubscriptionId} for user ${userId}`
    );
  }
}

/**
 * True when a Stripe error indicates the subscription no longer exists
 * (HTTP 404 / `resource_missing`). Duck-typed to avoid a value import of the
 * Stripe SDK and to stay test-friendly.
 */
function isMissingSubscriptionError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { statusCode?: number; code?: string };
  return e.statusCode === 404 || e.code === 'resource_missing';
}
