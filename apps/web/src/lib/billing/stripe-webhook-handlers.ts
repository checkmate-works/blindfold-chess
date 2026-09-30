import { revalidateTag } from 'next/cache';

import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';
import 'server-only';
import type Stripe from 'stripe';

import { getStripe } from '@/lib/billing/stripe';
import { SUBSCRIPTION_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import { db, stripeCustomers, subscriptions } from '@/lib/db';

/**
 * @note `bfc_ads_hidden` cookie is NOT updated here.
 *
 * Webhook handlers run in a Stripe → server HTTP session, with no access to
 * the user's browser cookie jar. The no-flash ad-hide cookie (see
 * `@/lib/ads/ads-hidden-cookie.ts`) is instead refreshed on the user's
 * next authenticated page load via the request proxy
 * (`apps/web/src/proxy.ts`) when they navigate to
 * `/mypage/subscription`. The Stripe checkout `success_url` points at
 * exactly that page, so a freshly-paid user lands with an up-to-date
 * cookie immediately after checkout. Subscription lifecycle
 * webhooks (`customer.subscription.updated`, `customer.subscription.deleted`)
 * still hit `revalidateTag('subscription-status')` below, so the next
 * visit recomputes entitlement from fresh DB state.
 *
 * @note Every handler must be safe to run twice for the same event.
 *
 * The route skips an event id it has already recorded as processed
 * (`stripe-webhook-events.ts`), but that record is written after the handler
 * succeeds, so two deliveries of one event that overlap in flight both run.
 * The handlers therefore write the subscription's current state as fetched
 * from Stripe (or, for `deleted`, its terminal state), never an increment,
 * so the second run rewrites what the first wrote.
 */

/**
 * Map a Stripe Subscription object to the DB column values used for
 * both insert and upsert-update operations.
 *
 * `cancelAt` is forced to `null` once the subscription is `canceled`. Stripe
 * keeps `cancel_at` on a subscription that was scheduled to end at the period
 * boundary and then did, but in this mirror a non-null `cancelAt` means
 * "cancellation pending" (see
 * {@link import('@/lib/billing/subscription-constants').isCancellationScheduled})
 * and the /mypage card renders it as such. A terminated row has nothing
 * pending, and `handleSubscriptionDeleted` and `cancelAllActiveSubscriptions`
 * both write `null` for the same reason; this keeps a canceled subscription
 * that reaches the mirror through `customer.subscription.updated` in the same
 * shape.
 */
export function toSubscriptionFields(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(`Subscription ${subscription.id} has no items`);
  }
  const terminated = subscription.status === 'canceled';
  return {
    stripePriceId: item.price.id,
    status: subscription.status,
    cancelAt:
      !terminated && subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
    currentPeriodStart: new Date(item.current_period_start * 1000),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
  };
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) return;

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);

  if (!session.customer) {
    Sentry.captureMessage(
      `checkout.session.completed: session ${session.id} has no customer (subscription: ${subscriptionId})`,
      'error'
    );
    return;
  }
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
  const [customerRecord] = await db
    .select({ userId: stripeCustomers.userId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.stripeCustomerId, customerId))
    .limit(1);

  if (!customerRecord) {
    // Every Checkout Session this app creates names a customer that is
    // already in `stripe_customers`, so a session whose customer is unknown
    // was created somewhere else -- a subscription set up by hand in the
    // Stripe dashboard, or a customer that belongs to another environment.
    // No retry can make the row appear, and throwing would turn that into a
    // 500 that Stripe keeps redelivering for three days, inflating the
    // endpoint's failure rate until it gives up. Record it for an operator
    // and acknowledge the event, the same way `handleSubscriptionUpdated`
    // treats an unknown customer.
    Sentry.captureMessage(
      `checkout.session.completed: no stripe_customers record for customer ${customerId} (session: ${session.id}, subscription: ${subscriptionId}). Manual intervention required.`,
      'error'
    );
    return;
  }

  const fields = toSubscriptionFields(subscription);

  await db
    .insert(subscriptions)
    .values({
      userId: customerRecord.userId,
      stripeSubscriptionId: subscription.id,
      ...fields,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        ...fields,
        updatedAt: new Date(),
      },
    });

  revalidateTag(SUBSCRIPTION_STATUS_CACHE_TAG, { expire: 60 });
}

/**
 * Mirror a subscription after a `customer.subscription.updated` event.
 *
 * The event payload is used only for the subscription id. Stripe does not
 * deliver events in order, so the `status: active` in an `updated` payload
 * may describe a subscription that a `customer.subscription.deleted` event
 * has since terminated -- and if the delivery of that `updated` event was
 * slow or retried, it can arrive after the `deleted` one was processed.
 * Writing the payload would then flip the row back to `active` and the
 * subscriber would keep their benefits with nothing left to revoke them.
 * Fetching the subscription from Stripe at processing time makes every write
 * reflect the state Stripe holds now, whatever order the events took.
 */
export async function handleSubscriptionUpdated(payload: Stripe.Subscription) {
  const subscription = await getStripe().subscriptions.retrieve(payload.id);
  const fields = toSubscriptionFields(subscription);

  const updated = await db
    .update(subscriptions)
    .set({
      ...fields,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .returning({ id: subscriptions.id });

  if (updated.length === 0) {
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    const [customerRecord] = await db
      .select({ userId: stripeCustomers.userId })
      .from(stripeCustomers)
      .where(eq(stripeCustomers.stripeCustomerId, customerId))
      .limit(1);

    if (customerRecord) {
      await db
        .insert(subscriptions)
        .values({
          userId: customerRecord.userId,
          stripeSubscriptionId: subscription.id,
          ...fields,
        })
        .onConflictDoUpdate({
          target: subscriptions.stripeSubscriptionId,
          set: {
            ...fields,
            updatedAt: new Date(),
          },
        });
    } else {
      Sentry.captureMessage(
        `customer.subscription.updated: no stripe_customers record for customer ${customerId} (subscription: ${subscription.id}). Manual intervention required.`,
        'warning'
      );
    }
  }

  revalidateTag(SUBSCRIPTION_STATUS_CACHE_TAG, { expire: 60 });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const deleted = await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      cancelAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .returning({ id: subscriptions.id });

  if (deleted.length === 0) {
    Sentry.captureMessage(
      `customer.subscription.deleted: no subscription record found for subscription ${subscription.id}. The checkout.session.completed event may have been missed.`,
      'warning'
    );
  }

  revalidateTag(SUBSCRIPTION_STATUS_CACHE_TAG, { expire: 60 });
}
