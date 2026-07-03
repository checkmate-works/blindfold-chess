// Split from schema/gamification.ts on 2026-07-04. Per-domain
// schema slice — user grants.
//
// Legacy `user_grants` (the pre-point-system benefit grants kept for the
// migration window). Point redemptions bridge into this table by issuing a
// grant row — see `pointRedemptions` in `./points`.
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
