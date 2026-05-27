// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — billing.
//
// Stripe customer linkage and subscription lifecycle state.
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * @design updated_at update policy
 *
 * For every table with an `updated_at` column, the timestamp is refreshed
 * automatically by Drizzle via `.$onUpdateFn(() => new Date())`. When adding a
 * new table that has an `updated_at` column, always attach this callback.
 *
 * Exceptions:
 * - `profiles`: updated by a Supabase BEFORE UPDATE trigger
 *   (`profiles_updated_at`). Because `profiles` can be written through
 *   internal Supabase paths that go via `auth.users` (e.g. auth hooks), the
 *   timestamp update is centralized at the DB trigger layer instead of
 *   `$onUpdateFn`. See the `@design` note on the `profiles` table
 *   definition for details.
 *
 * Existing call sites still contain several explicit
 * `set({ updatedAt: new Date() })` statements. They are redundant but
 * harmless and act as a fail-safe if an UPDATE path that bypasses Drizzle
 * is introduced in the future.
 */
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_subscriptions_user').on(table.userId),
    index('idx_subscriptions_stripe_sub').on(table.stripeSubscriptionId),
    index('idx_subscriptions_status').on(table.userId, table.status),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
