import { revalidateTag } from 'next/cache';

import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';
import 'server-only';
import type Stripe from 'stripe';

import { getStripe } from '@/lib/billing/stripe';
import { db, stripeCustomers, subscriptions } from '@/lib/db';

/**
 * @note `bfc_ads_hidden` cookie is NOT updated here.
 *
 * Webhook handlers run in a Stripe → server HTTP session, with no access to
 * the user's browser cookie jar. The no-flash ad-hide cookie (see
 * `@/lib/ads/ads-hidden-cookie.ts`) is instead refreshed on the user's
 * next authenticated page load via `refreshAdsHiddenCookie()` in
 * `/mypage/subscription/page.tsx`. The Stripe checkout `success_url`
 * points at exactly that page, so a freshly-paid user lands with an
 * up-to-date cookie immediately after checkout. Subscription lifecycle
 * webhooks (`customer.subscription.updated`, `customer.subscription.deleted`)
 * still hit `revalidateTag('subscription-status')` below, so the next
 * visit recomputes entitlement from fresh DB state.
 */

/**
 * Map a Stripe Subscription object to the DB column values used for
 * both insert and upsert-update operations.
 */
export function toSubscriptionFields(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(`Subscription ${subscription.id} has no items`);
  }
  return {
    stripePriceId: item.price.id,
    status: subscription.status,
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
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
    throw new Error(`No stripe_customers record for customer: ${customerId}`);
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

  revalidateTag('subscription-status', { expire: 60 });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
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

  revalidateTag('subscription-status', { expire: 60 });
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

  revalidateTag('subscription-status', { expire: 60 });
}
