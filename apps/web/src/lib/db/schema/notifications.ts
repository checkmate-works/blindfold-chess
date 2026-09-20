// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — notifications.
//
// Self-served ad creatives, their per-locale copy, and in-app notification rows.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { DEFAULT_NATIVE_THUMBNAIL_FEN } from '@/lib/ads/thumbnail';

import { createdAtOnly, timestamps } from './columns';

/**
 * Self-served ad inventory ("creatives").
 *
 * @design Columns, not a JSONB payload
 *
 * Kind-specific fields used to live in a `payload` JSONB column, on the
 * argument that a new ad format should be a new `kind` plus a type guard and
 * a renderer, with no migration. That held while a `banner` format sat next
 * to the native card. Once banners were retired, the kinds left differed only
 * by which of three nullable columns they use — `icon` for the tile,
 * `avatar_image_path` / `avatar_alt` for the card, neither for the thumb —
 * and the JSONB was buying a migration-free path nothing used, at the price
 * of every constraint below: a row it could not render was stored anyway and
 * dropped at read time, silently.
 *
 * `native_thumb` is what that trade looks like in practice. It arrived after
 * the column migration, for the puzzle result screen's board-thumbnail grid,
 * and needed no new column at all — it is the card's columns minus the author
 * row. What it cost was two CHECK constraints widened in one migration, in
 * exchange for the guarantee that a thumb carrying an emoji cannot be stored.
 *
 * The set of kinds is closed at compile time. `AD_KINDS` in
 * `@/lib/ads/registry` is a const tuple, and every kind has a hand-written
 * renderer and authoring form, so there is no shape the schema could fail to
 * anticipate. A new kind is still those code changes; it also extends
 * `ad_creatives_chk_kind` and `ad_creatives_chk_fields_for_kind` here, and
 * adds columns only if its shape needs a field no other kind has.
 *
 * `kind` is derived from `slot` by the registry and written, never chosen
 * (`createAdCreative`). It is stored because it is what the CHECK constraints
 * key on: a CHECK cannot read the registry, and a row written by hand never
 * passes through it.
 *
 * @design `slot` is NOT unique — creatives rotate within a placement
 *
 * `slot` identifies a placement (e.g. `feed-native-ad`), and multiple active
 * creatives may share one slot so they can rotate. The (slot → allowed kind)
 * binding is enforced in application code by `AD_SLOTS` in
 * `@/lib/ads/registry`, so writes must validate against that registry. There
 * is no CHECK on `slot` on purpose: the registry owns the set and it grows
 * with every new placement, whereas `kind` changes only with a new format.
 *
 * These are first-party creatives we host and link ourselves (affiliate links
 * etc.), read through `resolveNativeAds`. A slot whose pool is empty renders
 * nothing at all — there is no third-party network behind it to fall through
 * to.
 *
 * @design An image and its alt are a pair
 *
 * `avatar_alt` may be set only with `avatar_image_path`, and
 * `thumbnail_image_alt` only with `thumbnail_image_path`. Alt text describes
 * an image; without one it is a stray string the renderers would have to
 * know to ignore. `thumbnail_fen` is NOT NULL with a default board instead,
 * because the board is the thumbnail's fallback, not an optional extra.
 *
 * @design No `provider` column
 *
 * Affiliate traffic goes through one network, and priority within a slot is
 * already expressed by `sort_order`, so a column naming the network would say
 * nothing the order does not. Add one when per-network reporting is needed —
 * not before.
 */
export const adCreatives = pgTable(
  'ad_creatives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Discriminator — see `AdKind` in `@/lib/ads/registry`. */
    kind: varchar('kind', { length: 50 }).notNull(),
    /** Placement identifier — see `AdSlot` in `@/lib/ads/registry`. Not unique. */
    slot: varchar('slot', { length: 50 }).notNull(),
    /** Click destination (affiliate URL etc.), common to every kind. */
    href: varchar('href', { length: 2048 }).notNull(),
    /**
     * The only on/off switch. The table once also carried a schedule
     * (`start_at` / `end_at`, filtered at read time); it was removed in
     * 2026-07 after real use showed no need for it, so there is no second
     * condition that can silently take a creative out of rotation.
     */
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    /** `native_tile` only: the emoji that makes the tile read as a tile. */
    icon: varchar('icon', { length: 16 }),
    /** `native_card` only: the author-row image, or NULL for the text placeholder. */
    avatarImagePath: varchar('avatar_image_path', { length: 1024 }),
    avatarAlt: varchar('avatar_alt', { length: 255 }),
    /** The board shown when there is no override image — see `@/lib/ads/thumbnail`. */
    thumbnailFen: varchar('thumbnail_fen', { length: 100 })
      .notNull()
      .default(DEFAULT_NATIVE_THUMBNAIL_FEN),
    /** An uploaded image (a book cover, say) shown instead of the board. */
    thumbnailImagePath: varchar('thumbnail_image_path', { length: 1024 }),
    thumbnailImageAlt: varchar('thumbnail_image_alt', { length: 255 }),
    ...timestamps,
  },
  (table) => [
    index('idx_ad_creatives_slot_active').on(table.slot, table.isActive),
    check(
      'ad_creatives_chk_kind',
      sql`${table.kind} IN ('native_card', 'native_tile', 'native_thumb')`
    ),
    // The invariant the JSONB guard used to enforce by dropping the row at
    // read time, made a write-time error: a tile has an emoji and no author
    // row; a card has no emoji; a thumb has neither, because it is a
    // thumbnail with a one-line title and nothing else.
    check(
      'ad_creatives_chk_fields_for_kind',
      sql`(${table.kind} = 'native_tile' AND ${table.icon} IS NOT NULL AND ${table.icon} <> '' AND ${table.avatarImagePath} IS NULL AND ${table.avatarAlt} IS NULL) OR (${table.kind} = 'native_card' AND ${table.icon} IS NULL) OR (${table.kind} = 'native_thumb' AND ${table.icon} IS NULL AND ${table.avatarImagePath} IS NULL AND ${table.avatarAlt} IS NULL)`
    ),
    check(
      'ad_creatives_chk_avatar_alt_with_image',
      sql`${table.avatarAlt} IS NULL OR ${table.avatarImagePath} IS NOT NULL`
    ),
    check(
      'ad_creatives_chk_thumbnail_alt_with_image',
      sql`${table.thumbnailImageAlt} IS NULL OR ${table.thumbnailImagePath} IS NOT NULL`
    ),
  ]
);

export type AdCreativeRecord = typeof adCreatives.$inferSelect;

/**
 * Per-locale copy for a creative — the `glossary_term_translations` pattern.
 *
 * Both fields are nullable so a locale can override either one alone: a
 * Japanese title over the English description is a row with a NULL
 * description, and the reader gets the `en` description through
 * `resolveNativeCopy` (`@/lib/ads/copy`). A row that overrides nothing has no
 * reason to exist (`chk_says_something`), and the `en` row, being what every
 * other locale falls back to, must be complete (`chk_en_complete`). That the
 * `en` row exists at all is the admin validator's job — "at least one child
 * per parent" is not a CHECK — and the forms cannot save without it.
 *
 * Why a child table and not one row per locale on `ad_creatives`, the way
 * `articles` and `announcements` do it: a creative's locales are one
 * creative. They share the href, the on/off switch, the sort order and,
 * above all, the id, which is the sub-ID the affiliate network reports clicks
 * under (`@/lib/ads/subid`). Split rows would report one creative as two.
 *
 * `locale` has no CHECK against the supported set for the same reason `slot`
 * has none: `SUPPORTED_LOCALES` is owned by the code and grows without a
 * migration. A row for a locale the site no longer serves is skipped at read
 * time.
 */
export const adCreativeTranslations = pgTable(
  'ad_creative_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creativeId: uuid('creative_id')
      .notNull()
      .references(() => adCreatives.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 10 }).notNull(), // BCP 47
    title: varchar('title', { length: 2000 }),
    description: varchar('description', { length: 2000 }),
    ...timestamps,
  },
  (table) => [
    unique('uq_ad_creative_translation_locale').on(table.creativeId, table.locale),
    check(
      'ad_creative_translations_chk_says_something',
      sql`${table.title} IS NOT NULL OR ${table.description} IS NOT NULL`
    ),
    check(
      'ad_creative_translations_chk_en_complete',
      sql`${table.locale} <> 'en' OR (${table.title} IS NOT NULL AND ${table.description} IS NOT NULL)`
    ),
  ]
);

export type AdCreativeTranslationRecord = typeof adCreativeTranslations.$inferSelect;
export type NewAdCreativeRecord = typeof adCreatives.$inferInsert;

// Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    actorId: uuid('actor_id'),
    type: varchar('type', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: uuid('target_id'),
    groupKey: varchar('group_key', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    isRead: boolean('is_read').default(false).notNull(),
    ...createdAtOnly,
  },
  (table) => [
    index('idx_notifications_user_created').on(table.userId, table.createdAt),
    index('idx_notifications_unread')
      .on(table.userId)
      .where(sql`is_read = false`),
    index('idx_notifications_dedup').on(
      table.userId,
      table.type,
      table.actorId,
      table.targetType,
      table.targetId
    ),
    index('idx_notifications_group_key').on(table.userId, table.groupKey),
    index('idx_notifications_actor').on(table.actorId),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/**
 * Per-user notification-type mutes.
 *
 * @design One row per (user, type), not a JSON column on `profiles`
 *
 * Mirrors `user_follows`: a mute is a fact about a (user, type) pair, so it
 * gets its own row rather than a JSONB array/bitmask settings blob. This
 * keeps "is this type muted for this recipient?" a single indexed point
 * lookup from the {@link createNotification} choke point
 * (`@/lib/notifications/notification.ts`) instead of a full-row read of a
 * settings document, and needs no migration if the mutable set changes.
 *
 * @design Not every notification `type` is eligible to appear here
 *
 * Only the "social feed" types a user opts into by following someone or
 * posting (new_position, new_chunk_draft, chunk_published, new_game,
 * new_comment_on_topic) are mutable. `announcement` and other
 * transactional/account types (follow, like, reply, *_grant,
 * achievement_granted, *_edit_request_*) are deliberately excluded from the
 * settings UI so a user can never accidentally silence something like a
 * ToS notice. The restriction is enforced by `MUTABLE_NOTIFICATION_TYPES` in
 * `@/lib/notifications/mutable-types.ts`, not by this table — `type` stays a
 * plain varchar so extending the mutable set later is app-code-only. The
 * reverse (shrinking the set, e.g. `new_post` removed 2026-07) is also
 * app-code-only: rows for a no-longer-mutable type may linger here but every
 * reader filters by the current list, so they are ignored (delivery resumes).
 */
export const notificationMutes = pgTable(
  'notification_mutes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    type: varchar('type', { length: 50 }).notNull(),
    ...createdAtOnly,
  },
  (table) => [
    unique('uq_notification_mute').on(table.userId, table.type),
    index('idx_notification_mutes_user').on(table.userId),
  ]
);

export type NotificationMute = typeof notificationMutes.$inferSelect;
export type NewNotificationMute = typeof notificationMutes.$inferInsert;

/**
 * Chess Openings — master data for chess opening families.
 *
 * @description
 * Stores chess opening families (e.g., French Defense, Sicilian Defense) with their
 * representative PGN move sequences and resulting FEN positions. Used as topicKey
 * source for topic_posts with topicType='opening'.
 *
 * @design Master data, not user-generated content
 *
 * This table is seeded via migration/script and managed by admins only.
 * Users cannot create, modify, or delete openings. RLS allows public reads
 * but restricts writes to the service role.
 *
 * @design FEN derived from PGN at seed time
 *
 * The `fen` column stores the board state after executing the `pgn` moves.
 * This is computed at seed time using chess.js (via @blindfold-chess/features/chess-core)
 * to avoid runtime computation.
 *
 * @design slug as topicKey
 *
 * The `slug` column serves as the `topicKey` value when `topicType='opening'`,
 * following the same pattern as other topic types. It appears in URLs
 * (e.g., /topics/openings/french-defense).
 *
 * @design Flat URL slugs — no hierarchical paths
 *
 * Although parentSlug models a tree, URLs remain flat (/openings/kings-gambit-declined,
 * not /openings/kings-gambit/declined). The slug is used as topicKey in topicPosts and
 * as answerValue in userInterviewAnswers; hierarchical paths would require reverse-mapping
 * logic with no SEO or UX benefit. Hierarchy is expressed in the UI (breadcrumbs) instead.
 */
