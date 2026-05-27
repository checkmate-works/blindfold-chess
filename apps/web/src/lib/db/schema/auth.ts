// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — auth.
//
// User identity layer: the `profiles` row that mirrors Supabase `auth.users`,
// the `app_role` enum, and per-user role assignments. The FK to `auth.users`
// is defined in Supabase-side SQL (not Drizzle) — that's why `userId` columns
// elsewhere are marked `.notNull()` without a `.references()` clause.
import { pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

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
export const profiles = pgTable('profiles', {
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
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // updated_at is refreshed by the `profiles_updated_at` DB trigger (see the @design note above)
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_user_role').on(table.userId, table.role)]
);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
