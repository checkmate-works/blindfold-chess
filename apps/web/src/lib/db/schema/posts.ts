// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — posts.
//
// Topic posts (the threaded discussion primitive used by both topics/* and
// chunks/* surfaces), per-post likes, per-post ratings, and the five
// attachment kinds: PGN, embed (Lichess/Chess.com URL), image, FEN, and video.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { createdAtOnly, softDeleteTimestamp, timestamps } from './columns';

/**
 * Topic Posts — UGC (User Generated Content) for chess concepts.
 *
 * @description
 * A polymorphic table that stores user opinions/impressions about various chess
 * concepts (squares, diagonals, pawn structures, etc.).
 *
 * @design Polymorphic topicType + topicKey pattern
 *
 * Instead of creating separate tables per topic type (square_opinions,
 * diagonal_opinions, ...), this single table uses a discriminator pair:
 * - `topicType`: the category of the topic (e.g., 'square', 'diagonal', 'pawn-structure')
 * - `topicKey`: the identifier within that category (e.g., 'e4', 'a1h8', 'french')
 *
 * This avoids schema changes when adding new topic types. Validation of topicKey
 * values is handled at the application layer since the format differs per topicType.
 *
 * @design topicKey must always be short and URL-safe
 *
 * topicKey appears in URLs (e.g., /topics/squares/e4), so it must be concise and
 * URL-safe. For fixed/finite topics (squares: a1-h8, diagonals), the natural
 * identifier is used directly. For open-ended topics (pawn structures), a separate
 * master table provides human-readable slugs that serve as topicKey values,
 * keeping complex data (like FEN strings) out of the key/URL.
 *
 * @design topicType is varchar, not pgEnum
 *
 * New topic types (diagonals, pawn structures, etc.) will be added incrementally.
 * Using varchar avoids requiring an ALTER TYPE migration for each new type.
 *
 * @design No locale column — UGC is language-agnostic
 *
 * Unlike editorial content (posts, glossary), user-generated opinions are displayed
 * regardless of language. The [locale] route segment only affects UI chrome (labels,
 * buttons), not content filtering. This follows the pattern of major UGC platforms
 * (X, Reddit, Instagram) and avoids fragmenting a niche community by language.
 *
 * @design No title column
 *
 * Posts are short-to-medium opinions (similar to X posts or Reddit comments), not
 * titled articles. Omitting title: (1) lowers the posting friction, (2) avoids a
 * NULL-heavy column since replies (via parentId self-reference) never need titles,
 * and (3) eliminates the need for two different card layouts in list views.
 * Content preview (truncated first line) is used for list display instead.
 *
 * @design parentId for Reddit-style threaded replies (future scope)
 *
 * Top-level posts have parentId = null. Replies point to their parent's id.
 * The column exists in the initial schema to solidify the table structure, but
 * reply functionality is not implemented in the initial scope.
 *
 * @design reply_permission — poster-controlled reply restriction (X/Twitter model)
 *
 * Controls who can reply to a post, inspired by X/Twitter's reply restriction feature.
 * Allowed values: 'everyone' (default), 'followers', 'nobody'.
 * - 'everyone': anyone can reply (standard behavior)
 * - 'followers': only users who follow the post author can reply
 * - 'nobody': replies are disabled entirely
 * Uses varchar instead of pgEnum for extensibility — future values like
 * 'approval_required' can be added without ALTER TYPE migrations.
 *
 * @design FKs managed in custom SQL
 *
 * userId → auth.users and parentId → topic_posts self-reference are defined in
 * Supabase-side SQL (not Drizzle references), following the same pattern as
 * profiles.id. This is because auth.users lives in a separate Supabase-managed
 * schema that Drizzle does not control.
 */
export const topicPosts = pgTable(
  'topic_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable: topic posts are public forum content, so author deletion
    // anonymises (FK ON DELETE SET NULL) rather than cascading the thread away
    // — mirrors `games.author_id` / `chunks.user_id`. The app renders NULL as
    // "(deleted user)". FK defined in custom SQL.
    userId: uuid('user_id'), // references auth.users — FK defined in custom SQL
    topicType: varchar('topic_type', { length: 50 }).notNull(),
    topicKey: varchar('topic_key', { length: 50 }).notNull(),
    parentId: uuid('parent_id'), // self-referencing FK defined in custom SQL
    rootPostId: uuid('root_post_id'), // top-level post of the thread; NULL for top-level posts
    content: text('content').notNull(),
    replyPermission: varchar('reply_permission', { length: 20 }).notNull().default('everyone'),
    /**
     * Self-declared "this comment contains spoilers" flag. Currently surfaced
     * by the UI only for `topic_type='position_puzzle'` (puzzle pages) — when
     * `true`, the post body is rendered inside a `<details>` element so the
     * solution is not revealed until the reader opts in. Stored on every row
     * so the column can be reused for other spoiler-sensitive topic types
     * (e.g. opening lines) without a migration. Defaults to `false`, so
     * existing rows and topic types that do not expose the toggle behave
     * exactly as before.
     */
    isSpoiler: boolean('is_spoiler').notNull().default(false),
    /**
     * Per-post image attachment counter. Maintained by the BEFORE INSERT /
     * AFTER DELETE triggers on `post_image_attachments` (see migration
     * `20260504053253_create_post_image_attachments.sql`). Used by the
     * trigger to enforce MAX_IMAGES_PER_POST under concurrent INSERT
     * pressure (the trigger does `SELECT image_attachment_count ... FOR
     * UPDATE` on the parent row before incrementing). Application code
     * MUST NOT write to this column directly — the triggers are the
     * single source of truth.
     */
    imageAttachmentCount: smallint('image_attachment_count').notNull().default(0),
    ...softDeleteTimestamp,
    ...timestamps,
  },
  (table) => [
    // Partial index — every production read of `topic_posts` filters
    // `deleted_at IS NULL`, so excluding soft-deleted rows from the
    // index keeps the b-tree small and lets Postgres treat the
    // partial as an index-only scan for the common case (list pages,
    // reply-meta aggregates, like queries). A plain
    // `(topic_type, topic_key)` index is replaced by this partial in
    // the same migration; if a future query genuinely needs to see
    // tombstoned rows it should add its own index rather than widen
    // this one.
    index('idx_topic_posts_topic')
      .on(table.topicType, table.topicKey)
      .where(sql`deleted_at IS NULL`),
    index('idx_topic_posts_user').on(table.userId),
    index('idx_topic_posts_parent').on(table.parentId),
    index('idx_topic_posts_root').on(table.rootPostId),
  ]
);

export type TopicPost = typeof topicPosts.$inferSelect;
export type NewTopicPost = typeof topicPosts.$inferInsert;

/**
 * Polymorphic likes table.
 *
 * @design
 * Generic like table keyed by (target_type, target_id) so any entity can be liked
 * without adding per-entity tables (e.g., position_likes, puzzle_likes). Follows the
 * same polymorphic pattern used by `topicPosts` (topicType + topicKey), `moderationActions`
 * (targetType + targetId), and `feedItems` (entityType + entityId).
 *
 * - No FK on target_id: PostgreSQL cannot express polymorphic FKs. Orphan cleanup is
 *   handled at the application layer (e.g., when deleting a topic post).
 * - FK on user_id → auth.users: defined in `drizzle/supabase/foreign_keys_and_grants.sql`
 *   following the established Supabase pattern.
 * - Existing data from `topic_post_likes` is migrated with `target_type = 'topic_post'`.
 *
 * @design user_id nullable + ON DELETE SET NULL — a *given* like survives its
 *   author's deletion (anonymised), it is not erased. When a former member is
 *   physically purged (`purgeDeletedAccounts`), the FK sets `user_id = NULL`
 *   instead of cascading
 *   the row away, so the like still counts toward the liked content's total. The
 *   complementary half of the policy — physically deleting likes a withdrawing
 *   user *received* on their own content — is done in the app layer at deletion
 *   time (`deleteAccount` → `deleteReceivedLikes`), because the polymorphic
 *   `(target_type, target_id)` side has no FK to cascade through. NULL `user_id`
 *   is correct everywhere likes are read: counts are `COUNT(*)` over a target,
 *   and "did I like this" matches on the *current* user id (never NULL). The
 *   `UNIQUE(user_id, target_type, target_id)` constraint is unaffected — Postgres
 *   treats NULLs as distinct, so multiple anonymised likes on one target coexist.
 */
export const likes = pgTable(
  'likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable: ON DELETE SET NULL anonymises a like when its author is purged
    // (see the table's @design note). FK defined in custom SQL.
    userId: uuid('user_id'), // references auth.users — FK defined in custom SQL
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id').notNull(),
    ...createdAtOnly,
  },
  (table) => [
    unique('uq_like').on(table.userId, table.targetType, table.targetId),
    index('idx_likes_target').on(table.targetType, table.targetId),
    index('idx_likes_user').on(table.userId),
    // Composite index for "a user's likes of a given target type, newest first"
    // queries (e.g., "articles I liked"). Order matches the query predicate.
    index('idx_likes_user_type_created_at').on(
      table.userId,
      table.targetType,
      table.createdAt.desc()
    ),
  ]
);

export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;

/**
 * Topic Post Ratings — 1:1 extension of topic_posts for structured ratings.
 *
 * @description
 * Stores structured ratings (preference and proficiency) for topic posts.
 * Used for opening topics where users can rate how much they like an opening
 * and how proficient they are with it, in addition to or instead of free-text content.
 *
 * @design 1:1 relationship with topic_posts via UNIQUE constraint on post_id
 *
 * Not all topic posts have ratings (e.g., square topics are text-only).
 * A separate table avoids NULL-heavy columns on topic_posts and cleanly
 * separates structured ratings from free-text content.
 *
 * @design At least one rating required
 *
 * The CHECK constraint ensures that at least one of preference_rating or
 * proficiency_rating is provided. This prevents empty rating records.
 */
export const topicPostRatings = pgTable(
  'topic_post_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .unique()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    preferenceRating: smallint('preference_rating'),
    proficiencyRating: smallint('proficiency_rating'),
    ...createdAtOnly,
  },
  (table) => [
    check(
      'chk_rating_range_preference',
      sql`${table.preferenceRating} IS NULL OR (${table.preferenceRating} >= 1 AND ${table.preferenceRating} <= 5)`
    ),
    check(
      'chk_rating_range_proficiency',
      sql`${table.proficiencyRating} IS NULL OR (${table.proficiencyRating} >= 1 AND ${table.proficiencyRating} <= 5)`
    ),
    check(
      'chk_at_least_one_rating',
      sql`${table.preferenceRating} IS NOT NULL OR ${table.proficiencyRating} IS NOT NULL`
    ),
  ]
);

export type TopicPostRating = typeof topicPostRatings.$inferSelect;
export type NewTopicPostRating = typeof topicPostRatings.$inferInsert;

/**
 * PGN Game Attachments — PGN-stored chess game attached to a topic post.
 *
 * @description
 * One topic_post can have at most one attached chess game. v1 supports two
 * sources: user-pasted PGN, and Lichess URL (server-fetched into PGN at
 * post-creation time). All attachments store a normalized PGN string —
 * rendering always works from PGN, even for Lichess-sourced games.
 *
 * This table is `post_game_pgn_attachments` — the `pgn` infix disambiguates
 * it from the sibling table `post_game_embed_attachments`, which stores
 * iframe embed attachments. Both are independent members of the per-kind
 * attachment family described below.
 *
 * @design Per-kind attachment tables, not one polymorphic `attachments` table
 *
 * This is the canonical statement of the decision the whole
 * `post_*_attachments` family follows (pgn / embed / image / fen / video —
 * each of those TSDocs points back here). Every kind has its own column
 * shape (PGN body / embed id / storage path + blob metadata / FEN string /
 * provider + video id), its own CHECK constraints, and its own index needs.
 * Collapsing them into one table would either bloat every row with NULL
 * columns belonging to other kinds, or push the per-kind validation up to
 * the app layer where the DB can no longer enforce it. Per-kind tables keep
 * each attachment self-describing at the schema level; the cost is one extra
 * table per kind, which is cheap next to a shared table nothing can validate.
 *
 * @design 1:0..1 instead of 1:N (UNIQUE on post_id)
 *
 * v1 caps at one attachment per post. UNIQUE on post_id makes this an
 * invariant of the schema, not a soft business rule. If multi-attachment
 * is ever needed, drop the UNIQUE and add a `display_order` column —
 * neither is forward-incompatible.
 *
 * @design Dedicated table instead of polymorphic `attachments`
 *
 * Unlike `likes` / `moderation_actions` / `feed_items` (which are truly
 * polymorphic over many target types), attachments today and for the
 * foreseeable future are only ever attached to topic_posts. A dedicated
 * table mirrors the established 1:0..1 extension pattern used by
 * `topic_post_ratings` above and lets us:
 *   - express the 1:0..1 invariant via UNIQUE
 *   - foreign-key cleanly to topic_posts (CASCADE on post delete)
 *   - keep PGN-specific extracted columns (`header_white`, `result`, etc.)
 *     typed and indexable instead of inside JSONB
 *
 * @design source is varchar, not pgEnum
 *
 * Same rationale as topic_type / target_type elsewhere in this file:
 * varchar avoids ALTER TYPE migrations when 'inline_built' / 'chess_com'
 * (if a future API path opens up) join the set.
 *
 * @design Always store normalized PGN, even for Lichess sources
 *
 * Rendering is unified to one path: `parsePgnWithFen` + replayable board.
 * Lichess URL becomes `source='lichess'`, `source_url` populated, plus
 * the fetched PGN saved verbatim. This keeps the viewer offline-resilient
 * (no live Lichess dependency at view time) and removes a CSP/iframe
 * surface from the public site.
 *
 * @design FK to topic_posts (CASCADE)
 *
 * Attachments belong to their post. Soft-deletion of the post (deletedAt)
 * leaves the attachment row but the application layer (and RLS) hide it;
 * hard deletion of the post cascades the attachment.
 *
 * @design pgn_byte_length for fast moderation queries
 *
 * Indexed precomputed length so admin moderation can filter "abusively
 * large attachments" without touching the text column. The column is
 * also a CHECK input to enforce MAX_PGN_BYTES at the DB level.
 *
 * @design (source, source_game_id) composite index
 *
 * Lichess fetch reuse lookup: when a user attaches a Lichess game that
 * was already fetched and stored within the reuse window (see
 * `resolve-lichess-attachment.ts`), the previously stored PGN is reused
 * instead of re-fetching from Lichess. This index makes that lookup O(log N).
 *
 * @design Topic-type agnostic by construction
 *
 * This table intentionally does not know about `topic_type`. The parent
 * `topic_posts` row carries `topic_type` ('chunk' | 'square' | 'opening'),
 * and gating per-topic-type lives in the Server Action / RLS layer — not
 * here. Generalizing attachments to 'square' or 'opening' posts is
 * therefore a Server Action wrapper change only, with no schema migration.
 *
 * @design `attribution_platform` extensibility pattern
 *
 * The `(attribution_platform, attribution_path)` decomposition is built
 * to admit additional platforms beyond `'chesscom'`. Adding a third one
 * is a 3-step change with no schema redesign:
 *   (a) extend the `chk_attribution_platform_valid` allow-list,
 *   (b) add a parser arm in `apps/web/src/lib/games/`,
 *   (c) add a renderer arm in the attached-game card UI.
 * Do NOT pre-extend the CHECK with placeholder values that have no
 * matching parser/renderer — the CHECK is the contract.
 *
 * @design Soft-delete posture, PII, and GDPR
 *
 * When the parent `topic_posts` is soft-deleted (`deleted_at IS NOT NULL`),
 * the attachment row physically persists; visibility is gated by RLS plus
 * the `get-attachments-for-posts` query. Header columns (`header_white`,
 * `header_black`, etc.) may carry identifying data even after the parent
 * is hidden. For full data removal (e.g., GDPR right-to-be-forgotten),
 * hard-deleting `topic_posts` (CASCADE reaps the attachment) is required;
 * soft-delete alone is not sufficient. A scheduled SQL reaper for
 * soft-deleted attachments is a future option, not currently scheduled —
 * no formal SLA exists.
 */
export const postGamePgnAttachments = pgTable(
  'post_game_pgn_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .unique()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 20 }).notNull(), // 'pgn' | 'lichess' | (future)
    /**
     * 添付の元 URL（Lichess の game URL or chess.com の attribution URL）。
     * @security audit-only — 絶対に href として直接 render してはならない。
     *   表示用 href は (source, sourceGameId) または (attributionPlatform, attributionPath) から
     *   サーバ側で再構築する。詳細は AttachedGameCard.tsx 参照。
     *   `chk_source_url_audit_https` により、`https://` 以外のスキーム
     *   （`javascript:` / `data:` / `file:` 等）は DB レベルで拒否される。
     */
    sourceUrl: varchar('source_url', { length: 512 }), // canonical URL when source != 'pgn'
    sourceGameId: varchar('source_game_id', { length: 64 }), // Lichess gameId, etc.
    pgn: text('pgn').notNull(), // normalized PGN, always present
    pgnByteLength: integer('pgn_byte_length').notNull(), // for size-based moderation
    startingFen: varchar('starting_fen', { length: 100 }), // non-default starting position only
    moveCount: integer('move_count').notNull().default(0),
    // Extracted PGN headers (denormalized for list/preview without re-parsing).
    // All nullable: minimal "1. e4 e5" PGN has no headers.
    headerWhite: varchar('header_white', { length: 100 }),
    headerBlack: varchar('header_black', { length: 100 }),
    headerResult: varchar('header_result', { length: 10 }), // '1-0' | '0-1' | '1/2-1/2' | '*'
    headerEvent: varchar('header_event', { length: 200 }),
    headerSite: varchar('header_site', { length: 200 }),
    headerDate: varchar('header_date', { length: 20 }),
    // Privacy: poster opted to anonymize player names. The stored PGN is
    // already anonymized when this is true; the original headers are
    // discarded at save time (we never persist the real names).
    anonymized: boolean('anonymized').notNull().default(false),
    // Off-platform game attribution. Stored as a (platform, path) pair
    // rather than a free-form URL so the rendered href can be rebuilt
    // server-side from validated components — never from a persisted URL
    // that could have drifted via direct REST writes or future migrations.
    // `attribution_platform` is currently 'chesscom' only; `attribution_path`
    // is the URL pathname (e.g. '/game/live/12345'). Both are NULL together
    // or NOT NULL together — enforced by `chk_attribution_pair` at the DB.
    // See `apps/web/src/lib/games/chesscom-attribution.ts` for the parser.
    attributionPlatform: varchar('attribution_platform', { length: 20 }),
    attributionPath: varchar('attribution_path', { length: 160 }),
    ...createdAtOnly,
  },
  (table) => [
    check(
      'post_game_pgn_attachments_chk_pgn_byte_length',
      sql`${table.pgnByteLength} > 0 AND ${table.pgnByteLength} <= 102400`
    ),
    check('post_game_pgn_attachments_chk_source_valid', sql`${table.source} IN ('pgn', 'lichess')`),
    check(
      'post_game_pgn_attachments_chk_source_url_required_for_external',
      sql`${table.source} = 'pgn' OR ${table.sourceUrl} IS NOT NULL`
    ),
    // Even though `source_url` is audit-only and never
    // rendered directly as an href, pin its scheme to `https://` at the
    // DB so that an accidental future render (e.g. a refactor that
    // forgets the rebuild-from-components rule, a debug page that
    // dumps the row) cannot turn a `javascript:` / `data:` / `file:`
    // payload into a clickable link. Last line of defense.
    check(
      'post_game_pgn_attachments_chk_source_url_audit_https',
      sql`${table.sourceUrl} IS NULL OR ${table.sourceUrl} ~ '^https://'`
    ),
    // Defense-in-depth against PGN length spoofing: the cached
    // `pgn_byte_length` column is also a CHECK input for the byte_length check,
    // so a writer that submits a low precomputed length together with an
    // oversized PGN body would otherwise bypass the size cap. This CHECK
    // pins the precomputed value to the actual byte length at the DB level.
    check(
      'post_game_pgn_attachments_chk_pgn_byte_length_matches_octet_length',
      sql`${table.pgnByteLength} = octet_length(${table.pgn})`
    ),
    // attribution_platform allow-list: MVP supports 'chesscom' only.
    check(
      'post_game_pgn_attachments_chk_attribution_platform_valid',
      sql`${table.attributionPlatform} IS NULL OR ${table.attributionPlatform} IN ('chesscom')`
    ),
    // attribution_path format: must be a `/`-prefixed path of allowed
    // characters, length 1..128. Mirrors the regex enforced by
    // `parseChesscomAttribution` so a direct REST write cannot bypass it.
    check(
      'post_game_pgn_attachments_chk_attribution_path_format',
      sql`${table.attributionPath} IS NULL OR ${table.attributionPath} ~ '^/[A-Za-z0-9/_-]{1,128}$'`
    ),
    // Pair invariant: either both attribution columns are NULL or both
    // are NOT NULL. Prevents partial writes that would render with a
    // broken href.
    check(
      'post_game_pgn_attachments_chk_attribution_pair',
      sql`(${table.attributionPlatform} IS NULL AND ${table.attributionPath} IS NULL)
        OR (${table.attributionPlatform} IS NOT NULL AND ${table.attributionPath} IS NOT NULL)`
    ),
    // Forensic / admin filtering for oversized attachments.
    index('idx_post_game_pgn_attachments_size').on(table.pgnByteLength),
    // Lichess fetch reuse lookup: `(source='lichess', source_game_id='abcd1234')`
    // — see `apps/web/src/lib/games/resolve-lichess-attachment.ts`.
    index('idx_post_game_pgn_attachments_source_game').on(table.source, table.sourceGameId),
  ]
);

export type PostGamePgnAttachment = typeof postGamePgnAttachments.$inferSelect;
export type NewPostGamePgnAttachment = typeof postGamePgnAttachments.$inferInsert;

/**
 * Embed Game Attachments — iframe embed chess game attached to a topic post.
 *
 * @description
 * Schema scaffold only: no application code reads or writes this table yet.
 * The iframe embed feature that will use it renders chess.com
 * `<iframe src="https://www.chess.com/emboard?id={embed_id}">` and Lichess
 * `<iframe src="https://lichess.org/embed/{embed_id}">`.
 *
 * Why this is a separate table from `post_game_pgn_attachments` rather than a
 * source variant of it: see the per-kind design note on that table. The `pgn`
 * sibling stores PGN-text games; this table stores embed-only games that have
 * no PGN body — they carry only an embed identifier and provider
 * discriminator.
 *
 * @design 1:0..1 invariant (UNIQUE on post_id)
 *
 * Same as `post_game_pgn_attachments`: one post has at most one embed attachment.
 *
 * @design embed_id format
 *
 * Provider-specific identifier. chess.com: the `id` query param from the
 * emboard URL (numeric diagram ID). Lichess: the 8-character game ID (same
 * namespace as `post_game_pgn_attachments.source_game_id` for Lichess games).
 * The CHECK `^[A-Za-z0-9_-]{1,64}$` intentionally excludes `/` so Lichess
 * study chapter IDs (`{studyId}/{chapterId}`) cannot be stored — studies are
 * deliberately out of scope for the embed feature, and widening the CHECK is
 * the decision point if that changes.
 *
 * @design attribution columns mirror post_game_pgn_attachments
 *
 * The `(attribution_platform, attribution_path)` pair serves the same purpose
 * as in the PGN table: a validated decomposition of a click-through URL that
 * the renderer rebuilds server-side. The allow-list differs: embed table
 * supports both 'chesscom' and 'lichess' (Lichess embeds do require
 * attribution; PGN Lichess games use `source='lichess'` instead).
 */
export const postGameEmbedAttachments = pgTable(
  'post_game_embed_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .unique()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    embedProvider: varchar('embed_provider', { length: 20 }).notNull(), // 'chesscom' — Lichess is narrowed out (#83)
    embedId: varchar('embed_id', { length: 64 }).notNull(),
    /**
     * @design Audit-only canonical embed URL. NEVER read into the rendered
     *   iframe `src` or any clickable href — the renderer reconstructs the
     *   URL from `(embed_provider, embed_id)` server-side. This column exists
     *   for forensics / migration / debug only.
     * @security audit-only — never render this as a src or href directly.
     *   The embed URL is always reconstructed from (embedProvider, embedId)
     *   at render time. `chk_embed_source_url_https` pins the scheme.
     */
    sourceUrl: varchar('source_url', { length: 512 }),
    attributionPlatform: varchar('attribution_platform', { length: 20 }),
    attributionPath: varchar('attribution_path', { length: 160 }),
    ...createdAtOnly,
  },
  (table) => [
    check(
      'post_game_embed_attachments_chk_embed_provider_valid',
      sql`${table.embedProvider} IN ('chesscom')`
    ),
    check(
      'post_game_embed_attachments_chk_embed_id_format',
      sql`${table.embedId} ~ '^[A-Za-z0-9_-]{1,64}$'`
    ),
    check(
      'post_game_embed_attachments_chk_embed_source_url_https',
      sql`${table.sourceUrl} IS NULL OR ${table.sourceUrl} ~ '^https://'`
    ),
    check(
      'post_game_embed_attachments_chk_embed_attribution_platform_valid',
      sql`${table.attributionPlatform} IS NULL OR ${table.attributionPlatform} IN ('chesscom')`
    ),
    check(
      'post_game_embed_attachments_chk_embed_attribution_path_format',
      sql`${table.attributionPath} IS NULL OR ${table.attributionPath} ~ '^/[A-Za-z0-9/_-]{1,128}$'`
    ),
    check(
      'post_game_embed_attachments_chk_embed_attribution_pair',
      sql`(${table.attributionPlatform} IS NULL AND ${table.attributionPath} IS NULL) OR (${table.attributionPlatform} IS NOT NULL AND ${table.attributionPath} IS NOT NULL)`
    ),
    // Future embed dedup: mirrors the Lichess reuse index on the PGN table.
    index('idx_post_game_embed_attachments_provider_id').on(table.embedProvider, table.embedId),
  ]
);

export type PostGameEmbedAttachment = typeof postGameEmbedAttachments.$inferSelect;
export type NewPostGameEmbedAttachment = typeof postGameEmbedAttachments.$inferInsert;

/**
 * Image Attachments — N:1 (max 3) image attachments per topic post.
 *
 * @description
 * Sibling of `post_game_pgn_attachments` and `post_game_embed_attachments`
 * (per-kind attachment tables — see `postGamePgnAttachments` for why the
 * family is split this way).
 * Stores up to 3 images per post; the cap is enforced race-free by a
 * BEFORE INSERT trigger on this table that takes a row lock on the parent
 * `topic_posts` row (`SELECT ... FOR UPDATE`) and consults
 * `topic_posts.image_attachment_count`. The constant `MAX_IMAGES_PER_POST = 3`
 * is hardcoded inside the trigger function — to change it, ship a new
 * migration that does `CREATE OR REPLACE FUNCTION
 * public.enforce_post_image_count_limit()` with the new constant.
 *
 * @design Why a separate sibling table
 *
 * Same rationale as the sibling `post_game_*_attachments` tables — stated in
 * full on `postGamePgnAttachments`.
 *
 * @design No `public_url` column (rebuild from `storage_path` at read time)
 *
 * The bucket is public, so the URL is purely a function of
 * `(bucket, storage_path)`. Persisting it is redundant and a drift risk:
 * if the project ever moves to a CDN or a different bucket, every stored
 * URL would need a backfill. The renderer derives the URL from
 * `storage_path` at read time via the Supabase client's `getPublicUrl`
 * (or by string concatenation against a known public-URL prefix).
 *
 * @design `storage_path` regex pin
 *
 * The CHECK constraint pins `storage_path` to the canonical UUID
 * 8-4-4-4-12 layout for each segment:
 * `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/...$`,
 * which is exactly `${userId}/${postId}/${randomUuid}.${ext}`. This is a
 * defense-in-depth measure: the upload handler builds the path correctly, the
 * Storage RLS forbids the user from writing outside their own folder, and
 * this CHECK forbids a direct REST insert from registering a path that
 * violates the layout (e.g. `..` traversal, synthetic filenames, or
 * paths that point to another user's folder).
 *
 * @design 50 megapixel cap
 *
 * Decompression-bomb defense. A 50 MP cap comfortably exceeds reasonable
 * camera output (12 MP smartphone JPEG ≪ 50 MP) while making it hard to
 * craft a small JPEG that decodes to a multi-GB pixel buffer.
 *
 * @design SVG hard reject
 *
 * SVG is **not** in the allow-list. SVG is XML and can carry inline
 * scripts; even with a sanitizer, a future renderer change could
 * accidentally inline-render an SVG and reintroduce the XSS vector. The
 * Storage bucket also excludes `image/svg+xml` from `allowed_mime_types`,
 * and the API handler rejects SVG before reaching the DB.
 *
 * @design FK to topic_posts (CASCADE)
 *
 * Hard delete of the parent post cascades the attachment rows. Soft
 * delete (`deleted_at` set on `topic_posts`) leaves the rows in place,
 * but the application's `deletePost` Server Action issues a best-effort
 * Storage `remove()` for every attachment path before setting
 * `deleted_at`, and a daily reaper sweeps any storage objects whose
 * post is missing or has been soft-deleted longer than 7 days.
 *
 * @design `image_attachment_count` on parent (NOT on this table)
 *
 * The counter lives on `topic_posts` rather than being computed via a
 * COUNT() because the BEFORE INSERT trigger needs to lock a single row
 * (`SELECT ... FOR UPDATE`) to serialize the count check. Locking
 * `post_image_attachments` rows would not help because there is nothing
 * to lock for a row that does not yet exist. The counter is maintained
 * exclusively by the BEFORE INSERT / AFTER DELETE triggers in the
 * migration; application code MUST NOT write it.
 */
export const postImageAttachments = pgTable(
  'post_image_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    /**
     * `${userId}/${postId}/${randomUuid}.${ext}`. The shape is pinned by a
     * DB-level CHECK; the upload handler enforces the same shape before
     * the INSERT.
     */
    storagePath: varchar('storage_path', { length: 1024 }).notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    fileSize: integer('file_size').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    altText: varchar('alt_text', { length: 255 }),
    displayOrder: smallint('display_order').notNull().default(0),
    ...createdAtOnly,
  },
  (table) => [
    check(
      'post_image_attachments_chk_content_type',
      sql`${table.contentType} IN ('image/jpeg', 'image/png', 'image/webp')`
    ),
    check(
      'post_image_attachments_chk_file_size',
      sql`${table.fileSize} > 0 AND ${table.fileSize} <= 2097152`
    ),
    check(
      'post_image_attachments_chk_dimensions_positive',
      sql`${table.width} > 0 AND ${table.height} > 0`
    ),
    check(
      'post_image_attachments_chk_megapixels',
      sql`${table.width} * ${table.height} <= 50000000`
    ),
    check(
      'post_image_attachments_chk_storage_path_format',
      sql`${table.storagePath} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$'`
    ),
    index('idx_post_image_attachments_post').on(table.postId),
    index('idx_post_image_attachments_post_order').on(table.postId, table.displayOrder),
    /**
     * Unique on storage_path. Two purposes:
     *   1. Logical uniqueness — every storage_path embeds a random UUID, so
     *      a duplicate row would be a bug.
     *   2. RLS SELECT policy lookup — the `post_images_select_public` storage
     *      policy joins `storage.objects.name` to `storage_path` to gate
     *      reads on a non-soft-deleted parent post; without this index,
     *      every public-bucket read would trigger a sequential scan over
     *      this table.
     */
    uniqueIndex('idx_post_image_attachments_storage_path').on(table.storagePath),
  ]
);

export type PostImageAttachment = typeof postImageAttachments.$inferSelect;
export type NewPostImageAttachment = typeof postImageAttachments.$inferInsert;

/**
 * FEN Attachments — 1:0..1 FEN attachment per topic post.
 *
 * @description
 * Sibling of `post_game_pgn_attachments`, `post_game_embed_attachments`, and
 * `post_image_attachments` (per-kind attachment tables — see
 * `postGamePgnAttachments` for why the family is split this way).
 * Stores a single FEN string
 * representing a static chess position attached to a topic post — used to
 * render a mini-board next to the post (renderer is deferred to a follow-up
 * issue; this table only carries the data).
 *
 * @design 1:0..1 invariant (UNIQUE on post_id)
 *
 * Same as `post_game_pgn_attachments` / `post_game_embed_attachments`:
 * one post has at most one FEN attachment. The INSERT path uses
 * `createPostBase`'s `afterInsert(tx, postId)` hook so the attachment is
 * atomic with the post.
 *
 * @design Two-layer FEN validation
 *
 *   1. Structural CHECK constraint (this table) — coarse net that rejects
 *      whitespace-only input, control characters, malformed shape, illegal
 *      castling characters, and impossible en passant ranks.
 *   2. Application-layer chess-core `validateFenSemantic` — enforces
 *      piece counts (exactly one king per side, ≤ 8 pawns, no pawns on rank
 *      1 or 8), castling-rights consistency (rook + king on starting
 *      squares), and en passant target consistency (correct rank for side
 *      to move + pawn behind the target). Runs inside the Server Action
 *      before the INSERT.
 *
 * The DB CHECK is the last line of defense against a direct REST insert
 * that bypassed the Server Action.
 *
 * @design FEN regex tightening vs. issue #74 spec
 *
 * Issue #74 proposed `(-|[KQkqA-Ha-h]+)` for castling and `(-|[a-h][1-8])`
 * for en passant. We tighten both:
 *   - Castling is restricted to standard FEN (`[KQkq]+`), dropping the
 *     Shredder-FEN A-H/a-h files. Chess960 is out of scope for this MVP.
 *   - En passant rank is restricted to 3 or 6 (`[a-h][36]`). FIDE FEN allows
 *     en passant only on those two ranks (the rank behind the just-pushed
 *     pawn); the issue's loose `[1-8]` would have admitted nonsensical
 *     squares like `e1` or `e8` that semantic validation would reject anyway.
 *
 * Placement is intentionally permissive (`[rnbqkpRNBQKP1-8/]+`); semantic
 * validation handles rank-sum / king-count / pawn-rank checks.
 *
 * @design FK to topic_posts (CASCADE)
 *
 * Hard delete of the parent post cascades the attachment row. Soft delete
 * (`deleted_at` set on `topic_posts`) leaves the row in place; the RLS
 * SELECT policy gates reads on `deleted_at IS NULL` for defense in depth.
 */
export const postFenAttachments = pgTable(
  'post_fen_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .unique()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    /**
     * Full FEN string. Length cap 100 chars covers the longest realistic
     * FEN (~88 chars for a 32-piece middlegame with full castling and an
     * en passant square) with comfortable headroom.
     */
    fen: varchar('fen', { length: 100 }).notNull(),
    /**
     * Optional human caption for the position. Sanitized via
     * `sanitizeFenCaption` (see `@/lib/post-fens/sanitize-fen-caption.ts`)
     * to strip Trojan Source / zero-width / TAG / Musical Symbol formatter
     * codepoints before persistence. The DB column width matches
     * `post_game_pgn_attachments.header_event` / `header_site` (200) to
     * keep the sanitizer cap aligned across the attachment family.
     */
    caption: varchar('caption', { length: 200 }),
    ...createdAtOnly,
  },
  (table) => [
    check(
      'post_fen_attachments_chk_fen_format',
      sql`${table.fen} ~ '^[rnbqkpRNBQKP1-8/]+ [wb] (-|[KQkq]+) (-|[a-h][36]) [0-9]+ [0-9]+$'`
    ),
    index('idx_post_fen_attachments_post').on(table.postId),
  ]
);

export type PostFenAttachment = typeof postFenAttachments.$inferSelect;
export type NewPostFenAttachment = typeof postFenAttachments.$inferInsert;

/**
 * Video Attachments — 1:0..1 video attachment per topic post.
 *
 * @description
 * Sibling of `post_game_pgn_attachments`, `post_game_embed_attachments`,
 * `post_image_attachments`, and `post_fen_attachments` (per-kind attachment
 * tables — see `postGamePgnAttachments` for why the family is split this
 * way). Stores a single
 * embeddable video reference attached to a topic post. MVP supports only
 * the `'youtube'` provider; the schema is shaped so adding `'vimeo'` /
 * `'twitch'` is a CHECK widen + parser branch + renderer mapping change.
 *
 * @design 1:0..1 invariant (UNIQUE on post_id)
 *
 * Same as `post_fen_attachments`: a post has at most one video attachment.
 * Concurrent inserts surface as a `23505` unique-violation, mapped by the
 * Server Action to `alreadyAttached`.
 *
 * @design Two-layer video validation
 *
 *   1. Application-layer URL parser — `parseYouTubeUrl` in
 *      `@/lib/games/youtube-validator.ts` decomposes a user-supplied URL
 *      into `(provider, providerVideoId, sourceUrl)` and rejects hostile
 *      shapes (non-https, userinfo trick, IDN homograph, wrong host,
 *      param pollution, fragment, non-11-char id, embedded NUL/ZWSP).
 *   2. CHECK constraints below — the DB-level last line of defense
 *      against a direct REST insert that bypassed the Server Action. The
 *      `provider_video_id` regex is byte-for-byte aligned with the JS
 *      regex enforced after URL parsing (a static test pins the
 *      equivalence in `youtube-validator.test.ts`).
 *
 * @design Render-time `src` rebuild (audit-only `source_url`)
 *
 * The renderer reconstructs the iframe `src` from
 * `(provider, provider_video_id)` via the privacy-enhanced
 * `youtube-nocookie.com` host. `source_url` is never passed to the iframe;
 * it exists for audit only. This mirrors the Lichess embed pattern in
 * `parseLichessEmbedUrl` — the persisted URL is monotonically derived from
 * a validated provider id at write time, and the read path reconstructs
 * from the validated fields.
 *
 * @design `title` / `thumbnail_url` are NULL in MVP (oEmbed deferred)
 *
 * oEmbed (which would populate title + CDN thumbnail) is deferred
 * until the SSRF defense pattern in `lichess.ts` is replicated
 * for the YouTube oEmbed endpoint. The MVP renderer derives the thumbnail
 * URL from `provider_video_id` via the canonical YouTube template
 * (`img.youtube.com/vi/{id}/hqdefault.jpg`) and uses a localized
 * fallback for the iframe `title` attribute.
 */
export const postVideoAttachments = pgTable(
  'post_video_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .unique()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    /**
     * Provider discriminator. MVP allows only `'youtube'`; CHECK widens
     * with explicit migration when a new provider lands.
     */
    provider: varchar('provider', { length: 20 }).notNull(),
    /**
     * Provider-scoped video id. YouTube ids are exactly 11 chars from
     * the URL-safe base64 alphabet `[A-Za-z0-9_-]`. The CHECK regex is
     * byte-for-byte aligned with `YOUTUBE_VIDEO_ID_RE` in the URL parser.
     */
    providerVideoId: varchar('provider_video_id', { length: 64 }).notNull(),
    /**
     * Audit-only original URL. The renderer NEVER reads this; the iframe
     * src is rebuilt from `(provider, providerVideoId)`. Capped at 512 to
     * match the URL parser's `MAX_INPUT_LENGTH`.
     */
    sourceUrl: varchar('source_url', { length: 512 }),
    /**
     * Optional human-supplied or oEmbed-derived title. MVP persists
     * NULL — see oEmbed deferred note above.
     */
    title: varchar('title', { length: 200 }),
    /**
     * Optional CDN thumbnail URL. MVP persists NULL; reserved for the
     * oEmbed flow that may want to cache a CDN-hosted thumbnail.
     */
    thumbnailUrl: varchar('thumbnail_url', { length: 1024 }),
    ...createdAtOnly,
  },
  (table) => [
    check('post_video_attachments_chk_provider', sql`${table.provider} IN ('youtube')`),
    check(
      'post_video_attachments_chk_provider_video_id',
      sql`${table.providerVideoId} ~ '^[A-Za-z0-9_-]{11}$'`
    ),
    check(
      'post_video_attachments_chk_source_url',
      sql`${table.sourceUrl} IS NULL
      OR ${table.sourceUrl} ~ '^https://www\\.youtube\\.com/'
      OR ${table.sourceUrl} ~ '^https://youtube\\.com/'
      OR ${table.sourceUrl} ~ '^https://youtu\\.be/'
      OR ${table.sourceUrl} ~ '^https://www\\.youtube-nocookie\\.com/'`
    ),
    check(
      'post_video_attachments_chk_thumbnail_url',
      sql`${table.thumbnailUrl} IS NULL
      OR ${table.thumbnailUrl} ~ '^https://i\\.ytimg\\.com/'
      OR ${table.thumbnailUrl} ~ '^https://img\\.youtube\\.com/'`
    ),
    index('idx_post_video_attachments_post').on(table.postId),
  ]
);

export type PostVideoAttachment = typeof postVideoAttachments.$inferSelect;
export type NewPostVideoAttachment = typeof postVideoAttachments.$inferInsert;
