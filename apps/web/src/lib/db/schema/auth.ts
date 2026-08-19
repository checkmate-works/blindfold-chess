// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — auth.
//
// User identity layer: the `profiles` row that mirrors Supabase `auth.users`,
// the `app_role` enum, and per-user role assignments. The FK to `auth.users`
// is defined in Supabase-side SQL (not Drizzle) — that's why `userId` columns
// elsewhere are marked `.notNull()` without a `.references()` clause.
import { isNotNull } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { createdAtOnly, softDeleteTimestamp } from './columns';

/**
 * Profiles
 *
 * Note: email is intentionally omitted — it is managed by Supabase Auth
 * (auth.users) as the single source of truth. Do not duplicate it here
 * to avoid denormalization. Use a JOIN or the Admin API when needed.
 *
 * @design `updated_at` is refreshed automatically by a Supabase BEFORE UPDATE
 * trigger (`profiles_updated_at`). Because `profiles` can be updated through
 * internal Supabase paths that go via `auth.users` (e.g. auth hooks), the
 * update is centralized at the DB trigger layer instead of Drizzle's
 * `$onUpdateFn`.
 * See: apps/web/drizzle/supabase/rls_policies.sql L35-47
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(), // references auth.users(id) — FK defined in custom SQL
    username: varchar('username', { length: 255 }).unique().notNull(),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 1024 }),
    bio: text('bio'),
    country: varchar('country', { length: 2 }), // ISO 3166-1 alpha-2
    flair: varchar('flair', { length: 50 }),
    fideId: varchar('fide_id', { length: 50 }),
    chesscomUsername: varchar('chesscom_username', { length: 255 }),
    lichessUsername: varchar('lichess_username', { length: 255 }),
    xUsername: varchar('x_username', { length: 15 }),
    instagramUsername: varchar('instagram_username', { length: 30 }),
    youtubeHandle: varchar('youtube_handle', { length: 30 }),
    /**
     * Leaderboard opt-out (privacy setting, /preferences?tab=privacy).
     *
     * @design Scope: leaderboards only, deliberately
     * This started as a broader "Incognito" idea — hide the public profile AND
     * the leaderboard entry — and was narrowed on purpose. Hiding the profile
     * forces a decision about the author name and profile link already attached
     * to every published kata / game / topic the user has posted; the
     * leaderboard-only cut needs no such decision, so it ships independently and
     * the harder question stays open. Profile hiding is NOT implemented here;
     * do not extend this flag to cover it without revisiting that question.
     *
     * @design Current value only, no history
     * List queries, own-rank lookups, `challenge_rank_update` feed creation, and
     * the monthly badge batch each read this flag at their own execution time —
     * there is no per-period record of who was hidden when. The consequence is
     * intentional: already-granted badges and feed cards posted while visible
     * stay visible. This is a "stop appearing from now on" switch, not history
     * scrubbing, and the settings copy says so.
     *
     * @design Filtered in the score-source layer
     * The exclusion is applied where the ranked score set is built
     * (`allTimeBestScoresSql` / `periodBestScoresSql` / the `bestPerUser`
     * subquery in challenge-queries.ts), never in the display queries alone.
     * Rank numbers are derived from row position over that set, so filtering
     * there keeps a visible user's own rank consistent with the public list —
     * and makes a hidden user's rank resolve to null, which is what suppresses
     * their home-feed rank cards.
     *
     * Not indexed: a low-selectivity boolean that is always evaluated alongside
     * an already-indexed menu_type / leaderboard_key lookup, never a lookup key
     * on its own.
     */
    hiddenFromLeaderboard: boolean('hidden_from_leaderboard').notNull().default(false),
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    ...softDeleteTimestamp,
    ...createdAtOnly,
    // updated_at is refreshed by the `profiles_updated_at` DB trigger (see the @design note above)
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    /**
     * Deleted profiles only — a few percent of the table, so this index is tiny
     * and stays cached.
     *
     * @design Why the index covers the rare side
     * Anything that must exclude deleted members used to express it as a join
     * on `deleted_at IS NULL`, which matches nearly every row. Postgres builds
     * a hash over that side, so a follower count — logically O(followers) —
     * became a full sequential scan of `profiles` as soon as the row estimate
     * was high enough for the planner to prefer a hash join. Measured at 300k
     * profiles: 8,134 shared buffers for one count.
     *
     * Inverting the test to `NOT EXISTS (... deleted_at IS NOT NULL)` lets it
     * probe this index instead. Same result, 84 buffers. Write the exclusion
     * that way — not as a join on the null side — wherever the row count can
     * grow; `profileNotDeleted()` (`src/lib/db/profile-not-deleted.ts`) is the
     * shared helper.
     */
    index('idx_profiles_deleted').on(table.id).where(isNotNull(table.deletedAt)),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// App role enum
export const appRoleEnum = pgEnum('app_role', ['admin', 'user']);

// User roles table
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users
    role: appRoleEnum('role').notNull().default('user'),
    ...createdAtOnly,
  },
  (table) => [unique('uq_user_role').on(table.userId, table.role)]
);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
