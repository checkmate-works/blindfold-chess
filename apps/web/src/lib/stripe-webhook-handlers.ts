import { revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';
import 'server-only';
import type Stripe from 'stripe';

import { db, stripeCustomers, subscriptions } from '@/lib/db';
import { stripe } from '@/lib/stripe';

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
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: new Date(item.current_period_start * 1000),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
  };
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  const [customerRecord] = await db
    .select({ userId: stripeCustomers.userId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.stripeCustomerId, session.customer as string))
    .limit(1);

  if (!customerRecord) {
    throw new Error(`No stripe_customers record for customer: ${session.customer}`);
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

  await db
    .update(subscriptions)
    .set({
      ...fields,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  revalidateTag('subscription-status', { expire: 60 });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  revalidateTag('subscription-status', { expire: 60 });
}
