// Split from schema/gamification.ts on 2026-07-04. Per-domain
// schema slice — points/coin economy.
//
// The points ledger: `point_events` (append-only signed deltas),
// `user_point_balances` (materialized cache), batch watermarks,
// redemptions, and purchases.
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { createdAtOnly, updatedAtOnly } from './columns';
import { userGrants } from './grants';

/**
 * Point Events — append-only ledger of every point delta (grant or consumption).
 *
 * @description
 * Records every signed point movement. This table is the source of truth for
 * point balances and audit. Append-only: rows are never updated or deleted.
 * Mirrors the role of `exp_events` for the point economy.
 *
 * @design Two-table architecture (ledger + cache)
 *
 * Point data is split into two tables with different responsibilities:
 * - `point_events`: append-only ledger of every delta (INSERT only).
 *   Used for per-user history, audit, and rebuilding the cache.
 * - `user_point_balances`: materialized current balance per
 *   `(user_id, category)`, maintained via service-role-only writes.
 *
 * @design Signed `delta`, not separate amount + direction
 *
 * Every row carries a signed `delta` (positive = grant, negative = consumption).
 * This keeps balance derivation a single `SUM(delta)` regardless of source.
 *
 * @design `category` is varchar (not pgEnum)
 *
 * 'earned' (UGC contribution / received likes), 'purchased' (paid for in real
 * money), 'promotional' (campaign bonus). Stored on every row so balances can
 * be partitioned by category — purchased points may have distinct refund,
 * expiry, and redemption rules from earned points. Adding categories must not
 * require an ALTER TYPE migration; consistent with `topicType`, `grantType`,
 * `benefitType`.
 *
 * @design `source` + `source_id` for provenance
 *
 * Mirrors `exp_events.source`/`source_id`. `source` identifies the subsystem
 * that produced the delta (e.g., 'post_created', 'like_batch', 'redemption',
 * 'purchase', 'expiry', 'adjustment'). `source_id` is a free-form string
 * (varchar) so that non-UUID identifiers — Stripe event IDs, like-batch
 * watermark labels, etc. — can be referenced uniformly.
 *
 * @design `idempotency_key` UNIQUE — double-grant guard at the DB layer
 *
 * Every insert MUST carry a stable idempotency key. The UNIQUE constraint
 * is the hard backstop against duplicate grants from retried webhooks,
 * replayed batch jobs, or client retries. Recommended key shapes:
 *   - `post_created:<postId>`
 *   - `like_batch:<periodEndIso>:<userId>`
 *   - `purchase:<stripeEventId>`
 *   - `redemption:<redemptionId>`
 *   - `adjustment:<actorId>:<nonce>`
 *
 * @design `metadata` (JSONB) for extensible context
 *
 * Stores delta-specific context (e.g., like count rolled up in a batch row,
 * Stripe price snapshot, admin memo for adjustments) without schema changes.
 * Same pattern as `expEvents.metadata`, `userAchievements.metadata`.
 *
 * @design `expires_at` reserved for future expiring-points policy
 *
 * Carrying a per-row expiry timestamp lets future code introduce lot-based
 * FIFO consumption without a retrofit migration. Currently every row leaves
 * this NULL; consumption logic ignores it until the policy is enabled.
 *
 * @design FK for user_id managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle
 * references), following the same pattern as `expEvents.userId`.
 *
 * @design No `updated_at` — append-only by design
 *
 * The ledger is immutable. Once inserted, rows are never updated or deleted.
 */
export const pointEvents = pgTable(
  'point_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    delta: integer('delta').notNull(),
    category: varchar('category', { length: 30 }).notNull(), // 'earned' | 'purchased' | 'promotional'
    source: varchar('source', { length: 50 }).notNull(),
    sourceId: varchar('source_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    metadata: jsonb('metadata').default({}),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...createdAtOnly,
  },
  (table) => [
    index('idx_point_events_user_created').on(table.userId, table.createdAt),
    index('idx_point_events_source').on(table.source, table.sourceId),
    uniqueIndex('uq_point_events_idempotency_key').on(table.idempotencyKey),
  ]
);

export type PointEvent = typeof pointEvents.$inferSelect;
export type NewPointEvent = typeof pointEvents.$inferInsert;

/**
 * User Point Balances — materialized current balance per `(user_id, category)`.
 *
 * @description
 * Holds the running balance for every user, split by point category. Updated
 * via service-role-only writes whenever a `point_events` row is inserted.
 * Used for O(1) balance reads on hot paths (header chips, redemption screens).
 *
 * @design Materialized cache, rebuildable from point_events
 *
 * This table is a denormalized cache. If a balance is suspected wrong, the
 * authoritative value is recomputed from `point_events` via
 * `SELECT SUM(delta) FROM point_events WHERE user_id = ? AND category = ?`.
 * A periodic reconciliation job should compare cache vs. ledger and surface
 * any drift.
 *
 * @design Composite primary key `(user_id, category)`
 *
 * Each user has at most one row per category. Display logic can either sum
 * across categories ("total points") or treat each category separately
 * (e.g., "purchased points only redeemable for X").
 *
 * @design `version` for optimistic concurrency
 *
 * Application-side balance updates should bump `version` and `WHERE
 * version = :expected`; concurrent redemptions are then either serialized
 * or retried by the caller.
 *
 * @design FK for user_id managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL, following the
 * same pattern as `userExp.userId`.
 */
export const userPointBalances = pgTable(
  'user_point_balances',
  {
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    category: varchar('category', { length: 30 }).notNull(),
    balance: integer('balance').notNull().default(0),
    version: integer('version').notNull().default(0),
    ...updatedAtOnly,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.category] }),
    index('idx_user_point_balances_user').on(table.userId),
  ]
);

export type UserPointBalance = typeof userPointBalances.$inferSelect;
export type NewUserPointBalance = typeof userPointBalances.$inferInsert;

/**
 * Point Batch Watermarks — progress tracker for periodic point batch jobs.
 *
 * @description
 * Tracks the upper bound of source data already consumed by each batch job
 * (e.g., the `like_grant` job that converts received likes into points).
 * Enables resumable, idempotent batch runs: on each invocation the job reads
 * the stored `watermark`, processes everything strictly newer, then advances
 * the watermark within the same transaction.
 *
 * @design Single row per batch type
 *
 * `batch_type` is the PK. Current values: `'like_grant'`. Future batch jobs
 * (expiry sweeps, weekly leaderboard bonuses, etc.) get new rows.
 *
 * @design Idempotency cooperates with `point_events.idempotency_key`
 *
 * The batch job derives `idempotency_key` from `(batch_type, watermark, userId)`
 * so that even if the watermark advance fails after partial ledger writes, the
 * next run re-emits the same keys and the UNIQUE constraint on
 * `point_events.idempotency_key` absorbs duplicates.
 */
export const pointBatchWatermarks = pgTable('point_batch_watermarks', {
  batchType: varchar('batch_type', { length: 50 }).primaryKey(),
  watermark: timestamp('watermark', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  ...updatedAtOnly,
});

export type PointBatchWatermark = typeof pointBatchWatermarks.$inferSelect;
export type NewPointBatchWatermark = typeof pointBatchWatermarks.$inferInsert;

/**
 * Point Redemptions — records of point-for-benefit exchanges.
 *
 * @description
 * One row per redemption attempt. A successful redemption (a) inserts a
 * negative `point_events` row consuming the cost and (b) creates a
 * `user_grants` row that delivers the benefit (ad-free time, etc.).
 * The redemption row links to both so the full chain is queryable.
 *
 * @design Bridges the point economy with the existing grants system
 *
 * The application does not introduce a new entitlement table for point
 * exchanges. Instead, completing a redemption issues a `user_grants` row
 * with `grant_type='point_redemption'` and `source_type='point_redemption'`,
 * `source_id=<redemption.id>`. All existing benefit lookups
 * (`hasActiveGrant`, ad-free check, paywall check) work unchanged.
 *
 * @design `status` is varchar
 *
 * 'pending' (created, not yet consumed), 'completed' (ledger + grant
 * written), 'reversed' (compensating refund issued). Stored as varchar to
 * stay consistent with `topicType`/`benefitType`/etc.
 *
 * @design `product_code` is the source of truth for what the user bought
 *
 * Product catalog (cost, benefit type, duration) lives in code, not the
 * database. Same separation-of-policy-and-fact pattern as
 * `userGrants` + `grant-types.ts`.
 *
 * @design FK for user_id managed in custom SQL
 */
export const pointRedemptions = pgTable(
  'point_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    productCode: varchar('product_code', { length: 100 }).notNull(),
    cost: integer('cost').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    pointEventId: uuid('point_event_id').references(() => pointEvents.id, {
      onDelete: 'restrict',
    }),
    userGrantId: uuid('user_grant_id').references(() => userGrants.id, {
      onDelete: 'restrict',
    }),
    metadata: jsonb('metadata').default({}),
    ...createdAtOnly,
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_point_redemptions_user_created').on(table.userId, table.createdAt),
    index('idx_point_redemptions_status').on(table.status),
  ]
);

export type PointRedemption = typeof pointRedemptions.$inferSelect;
export type NewPointRedemption = typeof pointRedemptions.$inferInsert;

/**
 * Point Purchases — records of real-money purchases of points.
 *
 * @description
 * One row per purchase attempt. On a successful payment provider webhook,
 * the purchase is marked completed and a positive `point_events` row with
 * `category='purchased'` is inserted to credit the user.
 *
 * @design Schema-only stub for the future purchase flow
 *
 * The purchase Server Action / webhook handler is NOT implemented in this
 * migration — only the storage is introduced now so the broader point
 * economy is consistent end-to-end and no retrofit migration is needed
 * once the purchase UI is built.
 *
 * @design `(payment_provider, payment_intent_id)` UNIQUE
 *
 * Prevents double-credit if the payment provider re-sends a webhook with
 * the same intent. Paired with `point_events.idempotency_key` keyed on
 * the provider event ID, this is defense-in-depth.
 *
 * @design FK for user_id managed in custom SQL
 */
export const pointPurchases = pgTable(
  'point_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    amount: integer('amount').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    paymentProvider: varchar('payment_provider', { length: 30 }).notNull(),
    paymentIntentId: varchar('payment_intent_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    pointEventId: uuid('point_event_id').references(() => pointEvents.id, {
      onDelete: 'restrict',
    }),
    metadata: jsonb('metadata').default({}),
    ...createdAtOnly,
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_point_purchases_user_created').on(table.userId, table.createdAt),
    uniqueIndex('uq_point_purchases_payment_intent').on(
      table.paymentProvider,
      table.paymentIntentId
    ),
  ]
);

export type PointPurchase = typeof pointPurchases.$inferSelect;
export type NewPointPurchase = typeof pointPurchases.$inferInsert;
