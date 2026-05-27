// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — achievements.
//
// Achievement definitions and per-user awards.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
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
 * Achievements — master data for achievement badges.
 *
 * @description
 * Stores achievement definitions for the badge system. Each row defines a
 * distinct achievement that users can unlock by meeting specific criteria.
 * This table is admin-managed master data (read-only for users).
 *
 * @design Completely separate from the rank system (ranks table)
 *
 * Ranks represent skill-level progression (kyu/dan ranking: linear 5-kyu → shodan → 10-dan),
 * while achievements represent individual accomplishments unlocked by specific
 * actions or milestones. A user progresses through ranks sequentially, but can
 * unlock achievements in any order. The two systems coexist independently.
 *
 * @design slug as URL path segment and i18n key source
 *
 * `slug` serves as both the URL path segment (e.g., `/achievements/first-blood`)
 * and the base for next-intl translation keys (e.g., `achievements.first-blood.name`).
 * Display names are managed in message files, not in the database, keeping i18n
 * consistent with the rest of the application. Follows the same pattern as
 * `ranks.slug`, `articleCategories.slug`, and `chessOpenings.slug`.
 *
 * @design category is varchar, not pgEnum
 *
 * New achievement categories (`monthly_leaderboard`, `cumulative`, `streak`,
 * `one_shot`, `social`, `ai_defeat`, etc.) will be added incrementally.
 * Using varchar avoids requiring an ALTER TYPE migration for each new category.
 * Consistent with the project's established pattern (topicType, action, etc.).
 *
 * @design criteria as JSONB — category-specific judgment conditions
 *
 * Each achievement category has a different condition schema (e.g., leaderboard
 * placement for monthly_leaderboard, threshold count for cumulative, consecutive
 * days for streak). JSONB allows storing these heterogeneous schemas in a single
 * column without schema changes per category. Follows the same approach as
 * `ranks.requirements`. Type safety is enforced at the application layer via
 * the `AchievementCriteria` discriminated union type. The default value `{}`
 * is a pre-seed placeholder; when parsing into `AchievementCriteria`, the
 * application layer must validate the shape and reject/handle empty objects.
 *
 * @design repeatable flag for recurring vs one-time achievements
 *
 * When `repeatable` is true, the achievement can be granted multiple times
 * (e.g., monthly leaderboard badges awarded each month). When false, the
 * achievement is a one-time unlock (e.g., "first perfect score"). Duplicate
 * prevention for repeatable badges is handled at the application layer by
 * checking `user_achievements.metadata` (e.g., year/month).
 *
 * @design No updatedAt — master data changes are infrequent
 *
 * Achievement definitions are seeded via migration/script and rarely modified.
 * When changes occur, they are tracked through migration history.
 * Consistent with `ranks` which also omits updatedAt.
 */
export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  iconKey: varchar('icon_key', { length: 100 }).notNull(),
  criteria: jsonb('criteria').notNull().default({}),
  displayOrder: integer('display_order').notNull().default(0),
  repeatable: boolean('repeatable').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

/**
 * User Achievements — immutable achievement history.
 *
 * @description
 * Records when a user unlocks an achievement. This table is an immutable,
 * append-only log (INSERT-only, no updatedAt). Once inserted, records are
 * never updated or deleted. Follows the same immutability pattern as
 * `user_ranks`.
 *
 * @design metadata for grant context
 *
 * Stores context about why/when the achievement was granted. For monthly
 * leaderboard badges, this includes `{ year, month, score, placement }`.
 * For cumulative achievements, it might include `{ totalCount }`.
 * This enables audit trails and display of achievement details without
 * re-querying the original data source.
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc. This is
 * because `auth.users` lives in a separate Supabase-managed schema that Drizzle
 * does not control.
 *
 * @design onDelete: 'restrict' on achievementId — protect history from master data deletion
 *
 * If an achievement definition needs to be retired, it should be handled via
 * logical deletion rather than physical deletion. CASCADE would violate the
 * immutability guarantee of achievement records. Follows the same pattern as
 * `userRanks.rankId` → `ranks.id`.
 *
 * @design Repeatable badge deduplication is application-layer responsibility
 *
 * For repeatable achievements (e.g., monthly leaderboard badges), the application
 * layer must check `metadata` fields (e.g., year/month) before inserting to prevent
 * unintended duplicates. The database does not enforce uniqueness on (userId,
 * achievementId) because repeatable badges legitimately have multiple rows.
 *
 * @design achievedAt serves as the creation timestamp
 *
 * This table omits the conventional `createdAt` column. `achievedAt` records
 * when the achievement was unlocked, which is always the insertion time
 * (defaultNow()). Follows the same pattern as `userRanks.achievedAt`.
 */
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'restrict' }),
    metadata: jsonb('metadata').default({}),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_achievements_achievement').on(table.achievementId),
    index('idx_user_achievements_user_achievement').on(table.userId, table.achievementId),
  ]
);

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
