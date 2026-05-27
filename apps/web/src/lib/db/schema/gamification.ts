// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — gamification.
//
// Experience-point and points/coin economy: per-action `exp_events`, per-user
// totals (`user_exp`), legacy `user_grants` (the pre-point-system benefit
// grants kept for the migration window), and the points ledger
// (`point_events`, `user_point_balances`, batch watermarks, redemptions,
// purchases).
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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
 * Exp Events — append-only log of all Exp grants.
 *
 * @description
 * Records every Exp grant event. This table is the source of truth for
 * Exp history and audit. Append-only: rows are never updated or deleted.
 *
 * @design Two-table architecture (event log + cache)
 *
 * Exp data is split into two tables with different responsibilities:
 * - `exp_events`: append-only log of all Exp grants (INSERT only).
 *   Used for per-user Exp history and auditing.
 * - `user_exp`: materialized cumulative Exp per user, maintained via
 *   service-role-only writes. Serves as the source for leaderboard
 *   rankings and profile display.
 *
 * @design source + source_id for traceability
 *
 * `source` identifies the subsystem that generated the Exp grant
 * (e.g., 'challenge_result'). `source_id` optionally references the
 * originating record's ID for audit trails. Together they enable
 * tracing any Exp grant back to its origin.
 *
 * @design metadata (JSONB) for extensible context
 *
 * Stores grant-specific context (e.g., score details, bonus multipliers)
 * without requiring schema changes. Follows the same pattern as
 * `userAchievements.metadata` and `moderationActions.metadata`.
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc.
 *
 * @design No updatedAt — append-only by design
 *
 * This table is immutable. Once inserted, records are never updated or
 * deleted. `createdAt` serves as the sole timestamp.
 */
export const expEvents = pgTable(
  'exp_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    source: varchar('source', { length: 50 }).notNull(),
    sourceId: uuid('source_id'),
    menuType: varchar('menu_type', { length: 30 }),
    amount: integer('amount').notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_exp_events_user_created').on(table.userId, table.createdAt),
    index('idx_exp_events_source').on(table.source, table.sourceId),
    // Idempotency guard: prevents double-granting EXP for the same (source, source_id)
    // on retries. Partial index allows multiple rows with NULL source_id (e.g., future
    // grants not tied to a specific record).
    uniqueIndex('uq_exp_events_source_pair')
      .on(table.source, table.sourceId)
      .where(sql`source_id IS NOT NULL`),
  ]
);

export type ExpEvent = typeof expEvents.$inferSelect;
export type NewExpEvent = typeof expEvents.$inferInsert;

/**
 * User Exp — cumulative Exp cache per user.
 *
 * @description
 * Maintains exactly one row per user, representing the user's total
 * accumulated Exp. Updated via service-role-only writes whenever new
 * Exp is granted. Used for leaderboard rankings and profile display.
 *
 * @design Materialized cache, rebuildable from exp_events
 *
 * This table is a denormalized cache. If data correction is needed,
 * the total can be recalculated from `exp_events` using
 * `SUM(amount) GROUP BY user_id`. Follows the same cache pattern as
 * `challenge_best_scores`.
 *
 * @design Service-role-only writes
 *
 * INSERT and UPDATE are restricted to the service role to ensure
 * consistency. Client-side code cannot directly modify Exp totals.
 * RLS allows SELECT for authenticated and anon (leaderboard display).
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc.
 */
export const userExp = pgTable(
  'user_exp',
  {
    userId: uuid('user_id').primaryKey().notNull(), // references auth.users — FK defined in custom SQL
    totalExp: integer('total_exp').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('idx_user_exp_total').on(table.totalExp)]
);

export type UserExpRecord = typeof userExp.$inferSelect;
export type NewUserExpRecord = typeof userExp.$inferInsert;

/**
 * User Grants — time-limited benefit grants for users.
 *
 * @description
 * Stores grants that provide users with time-limited benefits such as ad-free
 * access or paywall content access. Grants can be issued manually by admins,
 * automatically by system triggers (e.g., topic post), or via campaigns.
 *
 * @design Additive duration model
 *
 * When a new grant is created, its `startsAt` is set to the later of the current
 * time and the latest existing `expiresAt` for the same user+benefitType. This
 * "stacks" grants so that multiple grants extend the benefit period rather than
 * overlapping or resetting it.
 *
 * @design No durationDays column — policy and fact are separated
 *
 * The duration (e.g., 7 days for topic_post) is a *policy* that lives in
 * code (`src/lib/db/data/grant-types.ts`) and can change over time. Each
 * grant record stores the *fact* — the concrete `startsAt`/`expiresAt` pair
 * computed at the moment of grant. This separation ensures that a later
 * policy change (e.g., 7 → 10 days) does not retroactively affect already
 * issued grants, and removes any ambiguity about which value was in effect
 * when a given grant was created. Git history on grant-types.ts is the
 * audit trail for policy changes.
 *
 * @design benefitType + grantType are varchar, not pgEnum
 *
 * New benefit types ('ad_free', 'paywall_access', etc.) and grant types
 * ('admin_manual', 'topic_post', 'campaign', etc.) will be added incrementally.
 * Using varchar avoids requiring an ALTER TYPE migration for each new type.
 * Consistent with the project's existing pattern (topicType, action, etc.).
 *
 * @design resourceType + resourceId for scoped grants
 *
 * Global benefits (e.g., ad_free) have NULL resourceType/resourceId.
 * Scoped benefits (e.g., paywall access to a specific article) specify the
 * resource. This avoids separate tables for global vs. scoped grants.
 *
 * @design sourceType + sourceId for trigger provenance
 *
 * Distinct from resourceType/resourceId (which describes what the benefit
 * applies TO / scope), source* records what triggered the grant (the
 * provenance / cause). For automated UGC grants, this links the grant
 * back to the action that earned it (e.g., topic_post + postId).
 * admin_manual grants leave these NULL. This enables targeted revocation
 * when the source entity is removed (e.g., when a topic post is deleted,
 * revoke all ad_free grants where sourceType='topic_post' and
 * sourceId=postId — note: this revocation flow is NOT yet implemented;
 * the source* columns exist now to make that future implementation
 * trivial without a retrofit migration).
 *
 * Polymorphic FK pattern (no DB-level FK) — consistent with topicPosts,
 * moderationActions, feedItems.
 *
 * @design revokedAt for logical deletion
 *
 * Grants are never physically deleted. Revocation sets revokedAt, preserving
 * the full audit trail. The granted_by info is tracked via moderation_actions
 * (the existing audit log), not duplicated here.
 *
 * @design reason is free-form text by design; grantType is the canonical "why"
 *
 * The categorical "why" of a grant is expressed by `grantType` (e.g.,
 * 'topic_post', 'admin_manual'), not by `reason`. A separate
 * `grant_reasons` master table was deliberately NOT introduced:
 *
 * - User-facing notification/display text is owned by the i18n layer
 *   (`messages/{locale}.json`, keyed by grantType), not the database.
 *   Storing localized copy in DB would duplicate next-intl infrastructure
 *   and lose ICU message format, type safety, and git-reviewable diffs.
 * - `reason` is meaningful only for `grantType='admin_manual'`, where it
 *   holds an ad-hoc admin memo. For automated grant types, reason is
 *   typically null and display text comes from i18n.
 * - Since `reason` is never queried/searched and never updated after
 *   insert, there is no update-anomaly risk from keeping it denormalized.
 *
 * @design No updatedAt — grants are effectively immutable
 *
 * Once created, grants are not modified (only revoked via revokedAt).
 * This follows the same immutability pattern as user_ranks.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`.
 */
export const userGrants = pgTable(
  'user_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    benefitType: varchar('benefit_type', { length: 50 }).notNull(), // 'ad_free', 'paywall_access', etc.
    grantType: varchar('grant_type', { length: 50 }).notNull(), // 'admin_manual', 'topic_post', 'campaign', etc.
    resourceType: varchar('resource_type', { length: 50 }), // NULL for global benefits, 'article' etc. for scoped
    resourceId: varchar('resource_id', { length: 255 }), // NULL for global benefits, target resource ID for scoped
    sourceType: varchar('source_type', { length: 50 }), // NEW: nullable; e.g., 'topic_post' for UGC-triggered grants
    sourceId: varchar('source_id', { length: 255 }), // NEW: nullable; the triggering entity ID
    reason: text('reason'), // Human-readable justification (admin memo, campaign name, etc.)
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_user_grants_benefit_lookup').on(table.userId, table.benefitType, table.expiresAt),
    index('idx_user_grants_user').on(table.userId),
    index('idx_user_grants_source').on(table.sourceType, table.sourceId),
  ]
);

export type UserGrant = typeof userGrants.$inferSelect;
export type NewUserGrant = typeof userGrants.$inferInsert;

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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
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
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
