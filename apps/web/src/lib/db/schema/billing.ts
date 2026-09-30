// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — billing.
//
// Stripe customer linkage and subscription lifecycle state.
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { createdAtOnly, timestamps } from './columns';

/**
 * Stripe Customers -- Supabase user to Stripe customer mapping.
 *
 * @description
 * Maps Supabase Auth user IDs to Stripe customer IDs (1:1).
 * Used as the `customer` parameter when creating Stripe Checkout sessions,
 * preventing duplicate Stripe customers for the same user.
 *
 * @design 1 user = 1 Stripe customer (UNIQUE constraint on userId)
 *
 * On first Checkout, a Stripe customer is created and stored here.
 * Subsequent Checkouts reuse the existing customer ID.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` -> `auth.users` is defined in Supabase-side SQL,
 * following the same pattern as `profiles.id`.
 */
export const stripeCustomers = pgTable('stripe_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull(), // references auth.users -- FK defined in custom SQL
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique().notNull(),
  ...createdAtOnly,
});

export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type NewStripeCustomer = typeof stripeCustomers.$inferInsert;

/**
 * Subscriptions -- Stripe subscription state mirror.
 *
 * @description
 * Mirrors Stripe subscription state in the local DB. Updated by Webhook
 * events and queried to determine ad visibility per user.
 *
 * @design status is varchar, not pgEnum
 *
 * Stripe subscription statuses ('active', 'canceled', 'incomplete',
 * 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused')
 * may change in the future. varchar avoids ALTER TYPE migrations.
 * Consistent with the project's existing pattern (topicType, action, etc.).
 *
 * @design No UNIQUE on userId (multi-subscription support)
 *
 * Stripe allows a customer to have multiple subscriptions. While the initial
 * scope is a single plan, this design supports future multi-plan scenarios.
 * UNIQUE is on stripeSubscriptionId instead.
 *
 * @design stripePriceId for future multi-plan identification
 *
 * Stores the Stripe Price ID to identify which plan a subscription belongs to.
 * Enables future expansion (e.g., $1/month ad-free + $5/month premium).
 *
 * @design cancelAt timestamp
 *
 * When a user cancels via Stripe Customer Portal, Stripe sets `cancel_at`
 * to the timestamp when the subscription will actually be terminated (equal
 * to `current_period_end`). We store this as a nullable timestamp rather
 * than using the boolean `cancel_at_period_end`, because Stripe's portal
 * cancellation flow sets `cancel_at` without setting `cancel_at_period_end`
 * to true, making the boolean unreliable. A non-null `cancelAt` means
 * cancellation is scheduled; null means the subscription renews normally.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` -> `auth.users` is defined in Supabase-side SQL.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users -- FK defined in custom SQL
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique().notNull(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // Stripe subscription status
    cancelAt: timestamp('cancel_at', { withTimezone: true }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('idx_subscriptions_user').on(table.userId),
    index('idx_subscriptions_stripe_sub').on(table.stripeSubscriptionId),
    index('idx_subscriptions_status').on(table.userId, table.status),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

/**
 * Stripe Webhook Events -- the ids of webhook events this app has finished
 * processing.
 *
 * @description
 * Stripe delivers each event at least once and in no particular order: a
 * delivery that timed out is re-sent, and two events for the same
 * subscription can arrive with the later one first. The webhook route
 * consults this table before dispatching an event and skips one it has
 * already processed, so a redelivery costs a primary-key lookup instead of a
 * Stripe API call, a write, and a cache invalidation.
 *
 * @design Written after processing, not before
 *
 * The row is inserted once the handler has succeeded. Inserting first and
 * treating a conflict as "already done" would be a tighter dedupe, but it
 * records an event the moment it arrives, so a handler that then failed (and
 * had the route answer 500 so that Stripe retries) would find its own retry
 * skipped as a duplicate. Recording after success means two deliveries of the
 * same event that overlap in flight are both processed; the handlers write
 * the subscription's current state as fetched from Stripe, so the second
 * write is the same as the first and the overlap is harmless.
 *
 * @design Ordering is not solved here
 *
 * This table only recognises an event id it has seen. It cannot tell that a
 * `customer.subscription.updated` carrying `status: active` is older than the
 * `customer.subscription.deleted` processed a moment ago -- the ids are
 * unrelated. That is why the handlers fetch the subscription from Stripe
 * instead of trusting the event payload: whatever order the events arrive in,
 * each write reflects the state Stripe holds at the time it is processed.
 *
 * @design Retention
 *
 * One row per event, a few per subscriber per billing cycle. Nothing prunes
 * the table today; at this volume it will take years to matter, and the rows
 * double as an audit trail of what the endpoint accepted.
 */
export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  /** Stripe's event id (`evt_...`). */
  eventId: varchar('event_id', { length: 255 }).primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  /** When Stripe created the event (`event.created`), for reconciliation. */
  eventCreatedAt: timestamp('event_created_at', { withTimezone: true }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
