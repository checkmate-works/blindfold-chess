// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — positions.
//
// Practice positions, position tags, knowledge chunks (the curriculum building
// block), chunk edit-request workflow, and the position ↔ chunk and position ↔
// glossary-theme join tables. Cross-imports `tags` from ./articles
// (positionTags) and `glossaryTerms` from ./glossary (positionThemes) — both
// `references()` clauses survive the split because Drizzle resolves them at
// runtime.
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { BoardAnnotations } from '@/lib/board-annotations/types';

import { tags } from './articles';
import { glossaryTerms } from './glossary';

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

const EMPTY_BOARD_ANNOTATIONS_DEFAULT: BoardAnnotations = { arrows: [], circles: [] };
/**
 * Positions — user-submitted chess positions for various practice modules.
 *
 * @description
 * A generic table that holds user-submitted chess positions.
 * Used across multiple practice modules: position-memory, puzzles,
 * and future modules that need a stored FEN with metadata.
 *
 * @design No uniqueness constraint on FEN
 * The same FEN may appear in multiple rows with different titles and
 * descriptions — each is treated as a distinct problem.
 *
 * @design `updated_at` is present — positions are editable UGC
 * `positions` supports editing and exposes `updatedAt`, which is refreshed
 * automatically by Drizzle via `.$onUpdateFn(() => new Date())` (see the
 * file-level `@design updated_at update policy` note).
 *
 * Immutability in this schema is reserved for:
 * - Append-only audit / history tables: `moderation_actions`,
 *   `user_activity_log`, `user_ranks`, `user_achievements`, `exp_events`,
 *   `user_grants`
 * - Infrequently-mutated master data: `ranks`, `achievements`
 *
 * Junction tables (e.g. `position_tags`) also omit `updated_at` by
 * convention since they carry no meaningful attribute.
 *
 * Only user-authored content tables (`positions`, `chunks`) accept edits
 * and expose `updated_at`.
 *
 * @design `type` is varchar (not a pgEnum)
 * Follows the existing `topicType` pattern. New type values (e.g. 'puzzle',
 * 'sequence') can be added without ALTER TYPE migrations.
 *
 * @design FKs managed in custom SQL
 * `userId` → `auth.users` is defined in Supabase-side SQL, not Drizzle
 * references, following the same pattern as `profiles.id` and
 * `topicPosts.userId`.
 *
 * @design Logical deletion
 * `deletedAt` enables soft-delete. Rows with a non-null `deletedAt` are
 * treated as 404 by the application layer.
 */
export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    type: varchar('type', { length: 50 }).notNull(), // 'memory', 'puzzle', 'sequence', etc.
    fen: varchar('fen', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    /**
     * @design Fork lineage (GitHub-style fork)
     * Points at the original `positions.id` this row was forked from.
     * NULL for original (non-fork) submissions. No FK constraint here — the
     * parent row may be physically deleted later, and we deliberately allow
     * orphan pointers so the lineage stamp survives. The application layer
     * resolves NULL / not-found / soft-deleted parents as "(deleted)".
     */
    forkedFromId: uuid('forked_from_id'),
    /**
     * @design Fork-disable lock (timestamp-as-flag)
     * NULL = forks allowed; NOT NULL = forks are denied at try-time and the
     * timestamp records when the lock was applied. The lock is permanent by
     * design: a row that was ever locked stays locked even if the author's
     * paid-plan privilege later lapses. Only the "set / unset" UI is gated by
     * plan status — the fork-attempt path checks this column alone, so plan
     * lapse does not silently re-open previously locked rows.
     */
    forksDisabledAt: timestamp('forks_disabled_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_positions_user').on(table.userId),
    // Composite partial index for the public positions list, which filters by
    // `type` and orders by `created_at DESC` while excluding soft-deleted rows.
    // Replaces the former single-column `idx_positions_type` (dropped in the
    // same migration) because Postgres could not use it for the ORDER BY.
    index('idx_positions_type_created_at')
      .on(table.type, table.createdAt.desc())
      .where(sql`deleted_at IS NULL`),
    // Reverse lookup: "show forks of this position". Partial, so the index
    // only carries rows that actually have a parent (NULL is the common case).
    index('idx_positions_forked_from')
      .on(table.forkedFromId)
      .where(sql`forked_from_id IS NOT NULL`),
  ]
);

export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;

// Position Tags (junction table)
export const positionTags = pgTable(
  'position_tags',
  {
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('uq_position_tag').on(table.positionId, table.tagId),
    // Secondary index on `tag_id` for reverse lookups ("positions with tag X").
    // The uq_position_tag UNIQUE already covers position_id → tag_id, so no
    // dedicated index on position_id is needed.
    index('idx_position_tags_tag').on(table.tagId),
  ]
);

export type PositionTag = typeof positionTags.$inferSelect;
export type NewPositionTag = typeof positionTags.$inferInsert;

/**
 * Chunks — catalog of piece-coordination patterns.
 *
 * @description
 * A named chess piece-coordination pattern — for example a fianchetto,
 * a rook battery on the 7th rank, a French-style pawn chain, and so on.
 * Each row is a reusable building block that `positions` can link to via
 * `position_chunks`, describing which patterns a given memory position
 * contains.
 *
 * @design catalog, not discussion — why chunks is a separate table from topic_posts
 * Both `chunks` and `topic_posts` are UGC, but they differ in nature:
 * - `topic_posts` are **discussions** — free-form text tied to a topic
 *   (opening or square), with replies, likes, and ratings.
 * - `chunks` are **catalog entries** — structured data (FEN, slug, title)
 *   that serve as reusable building blocks linked to positions via the
 *   `position_chunks` junction table.
 *
 * Merging chunks into `topic_posts` via polymorphism (STI) was considered
 * but rejected because:
 * (a) chunks have unique columns (`representative_fen`, `slug`) that would
 *     become nullable in a shared table;
 * (b) chunks have a many-to-many relationship with `positions` via
 *     `position_chunks`, which is structurally different from the 1:N
 *     relationship `topic_posts` have with their topics;
 * (c) the RLS model differs — chunks are a public catalog editable only by
 *     the author, whereas topic_posts support reply permissions, ratings,
 *     and moderation workflows.
 *
 * The UI navigation places chunks alongside topics (linked from `/topics`)
 * because both are UGC, but the URL is `/chunks` (not `/topics/chunks`)
 * to reflect that chunks are a catalog, not a discussion forum.
 *
 * @design comments live in `topic_posts` (topicType='chunk')
 * The chunks/topic_posts table separation is about the catalog body itself
 * (see "@design catalog, not discussion" above). Discussions about a chunk
 * are stored in `topic_posts` with `topic_type='chunk'` and
 * `topic_key=chunk.slug`, following the same polymorphic pattern as 'square'
 * and 'opening' topic types. This preserves the rule that chunks are a catalog
 * (not a discussion forum) while letting the existing UGC discussion
 * infrastructure (replies, likes, moderation, rate-limit, activity log) be
 * reused unchanged.
 *
 * @design catalog of piece-coordination patterns
 * `chunks` is a catalog — not per-user scratch data. Each row represents one
 * recognizable pattern named by its submitter (title) and optionally
 * illustrated by a representative board (`representative_fen`).
 *
 * @design public catalog — UGC but globally visible
 * Chunks are user-submitted, but once created they function as a global
 * public catalog:
 * - SELECT is open to `anon` and `authenticated`.
 * - UPDATE / logical DELETE (via `deletedAt`) are restricted to the chunk's
 *   creator.
 * - Physical DELETE is restricted to the service role.
 * - Chunk creators cannot veto which positions link to their chunks —
 *   linking is governed by the position's owner (see `position_chunks`
 *   RLS), not by the chunk's owner.
 *
 * @design representative_fen is not unique
 * Multiple chunks may legitimately share the same `representative_fen`,
 * and conversely the same pattern may be illustrated by different boards.
 * `representative_fen` is a display-only identity (a thumbnail board for
 * the catalog entry), not a pattern identity, so NO UNIQUE constraint is
 * attached to it.
 *
 * @design type='memory' only is enforced at the application layer
 * The rule "only positions with type='memory' can link to chunks" is
 * enforced in Server Actions (e.g. the createPosition-style flows that
 * attach chunks), NOT at the database level.
 *
 * A DB-level alternative using a composite foreign key
 * `(position_id, position_type) REFERENCES positions(id, type)` plus a
 * CHECK constraint on the junction is technically possible in Postgres,
 * but it would require adding `UNIQUE (id, type)` to `positions` purely
 * to serve as the composite FK target. That cost was judged not worth it
 * for this feature, so the invariant is kept in application code.
 *
 * @design author attribution
 * Each row carries the `user_id` of the chunk's creator. The public UGC
 * flow (`/chunks/new`) sets this column from the authenticated Supabase
 * user via `createChunkEntry` (`lib/chunks/user-chunk-mutations.ts`).
 * Admin tooling (`/admin/chunks`) is read-only beyond soft-delete — it
 * does not author chunks — so the column has a single write path.
 *
 * @design FKs managed in custom SQL
 * `userId` → `auth.users` is defined in Supabase-side
 * `foreign_keys_and_grants.sql`, not in Drizzle references — following the
 * same pattern as `profiles.id`, `positions.userId`, and `topicPosts.userId`.
 *
 * @design user_id is nullable — orphaned chunks after account deletion
 * `userId` is intentionally nullable and the Supabase-side FK uses
 * `ON DELETE SET NULL`. When a user's account is hard-deleted, their
 * chunks are kept as orphaned public catalog entries (user_id becomes
 * NULL) rather than cascaded.
 *
 * This is intentional: chunks function as a global public catalog, and
 * removing them on author deletion would leave dangling references from
 * other users' `position_chunks` rows. Combined with
 * `position_chunks.chunk_id ON DELETE RESTRICT`, a CASCADE here would
 * also deadlock hard deletes through the FK graph. Orphaning is the
 * safer, review-friendly fallback; the usual deprecation path remains
 * logical delete via `deletedAt`, which is owner-controlled.
 *
 * @design logical delete
 * `deletedAt` enables soft-delete. Rows with a non-null `deletedAt` are
 * excluded from the public catalog at the application layer; service-role
 * admin tools can still see them for audit/recovery.
 */
export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    // Nullable so that hard-deleted authors leave orphaned public-catalog rows
    // rather than cascading and breaking position_chunks references.
    userId: uuid('user_id'),
    title: varchar('title', { length: 255 }).notNull(),
    /**
     * Public catalog URL segment (`/chunks/<slug>`) and the
     * `topic_posts.topic_key` for the chunk's discussion thread.
     *
     * @design draft-editable, published-locked
     * Editable while the chunk is in `status='draft'` — the workshop
     * state often involves naming churn so the URL needs to keep up.
     * Renames go through `updateChunkEntry`, which cascades the new
     * value to `topic_posts.topic_key` for every chunk-typed reply in
     * the same transaction so existing discussion threads stay
     * attached. Locked once `status='published'`: published links and
     * discussion pointers may have escaped to the wider web, so the
     * application layer rejects slug edits on the published path.
     */
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    representativeFen: varchar('representative_fen', { length: 100 }).notNull(),
    /**
     * @design draft / published lifecycle
     *
     * Chunks describe piece-coordination patterns whose naming is often
     * collaborative — well-known shapes (fianchetto, rook battery)
     * resolve quickly, but novel variants need discussion before the
     * canonical title settles. The `status` column carries that
     * lifecycle:
     *
     * - `draft` — workshop state. Owner can edit freely; other users
     *   see it on the catalog (with a "Draft" badge) and can submit
     *   Qiita-style edit-suggestion requests against the title /
     *   description (see `chunk_edit_requests`). New chunks created
     *   via the UGC flow default to `draft`.
     * - `published` — canonical state. The author has settled the title /
     *   description; the row is locked against owner edits at the
     *   application layer so the slug, title, and description that
     *   other users may have linked to remain stable. Publish is
     *   one-way; the only way out is soft delete via
     *   `deleteChunkEntry`. On the publish transition any still-
     *   pending `chunk_edit_requests` rows are auto-rejected in the
     *   same transaction so they do not strand behind the now-
     *   inaccessible review UI.
     *
     * Stored as varchar (not pgEnum) so future states (`archived`,
     * `deprecated`, …) can be added without an ALTER TYPE migration —
     * matches the existing `topicType` / `moderation_actions.action`
     * pattern.
     *
     * The column ships with `DEFAULT 'published'` so the migration that
     * introduces it leaves every existing row in the same state the
     * application treated them as before this column existed.
     */
    status: varchar('status', { length: 20 }).notNull().default('published'),
    /**
     * Set when `status` transitions to `'published'`. NULL for chunks
     * that are still in draft (or that have been re-drafted in
     * theory; publish is currently one-way so this column is
     * monotonic in practice). Distinct from `createdAt` so catalog
     * surfaces can sort by "recently published" instead of "recently
     * authored as a draft"; the activity log carries the audit-trail
     * equivalent but is not indexed for catalog queries.
     */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /**
     * Display-only board markup (arrows + circles) drawn on top of the
     * representative board to make the pattern instantly readable
     * (e.g. arrows showing the bishop's diagonal in a fianchetto, or the
     * rook battery's file). Inline JSONB rather than a side table because
     * each chunk owns at most one set of annotations and the data has no
     * independent identity. See
     * `apps/web/src/lib/board-annotations/types.ts` for the schema.
     */
    annotations: jsonb('annotations')
      .$type<BoardAnnotations>()
      .notNull()
      .default(EMPTY_BOARD_ANNOTATIONS_DEFAULT),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_chunks_user').on(table.userId),
    // Partial index for the public catalog listing, which orders by
    // `created_at DESC` and excludes soft-deleted rows. Mirrors the
    // `idx_positions_type_created_at` pattern on `positions`.
    index('idx_chunks_created_at')
      .on(table.createdAt.desc())
      .where(sql`deleted_at IS NULL`),
  ]
);

export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;

/**
 * Chunk Edit Requests — Qiita-style suggestions for a draft chunk's
 * title / description from users other than the chunk's owner.
 *
 * @description
 * Chunks describe piece-coordination patterns whose naming is often
 * collaborative — once a draft is up, other players can suggest a
 * cleaner title or a sharper description. The owner reviews each
 * suggestion and either accepts it (the proposed fields are applied
 * to the chunk in the same transaction) or rejects it. Proposers can
 * also withdraw their own pending requests.
 *
 * @design status lifecycle
 * `pending` → `accepted` | `rejected` | `withdrawn`. All terminal
 * states are immutable; idempotent at the application layer. Once a
 * chunk is published the application layer rejects new submissions
 * and rejects accept/reject on existing pending rows (they remain
 * pending and can be acted on if the owner un-publishes later). This
 * keeps the workshop semantics tight without needing to auto-resolve
 * everything at publish time.
 *
 * @design optional fields
 * `proposed_title` and `proposed_description` are independently
 * nullable so a request can target only what the proposer actually
 * wants to change — but the application layer requires at least one
 * to be present AND different from the chunk's current value at
 * submit time. The DB does not enforce this XOR-ish rule because
 * the comparison against current values can't live in a CHECK
 * constraint without a JOIN.
 *
 * @design proposer_id nullable + ON DELETE SET NULL
 * Mirrors the `chunks.user_id` semantics — if a proposer's account
 * is hard-deleted, the request survives with `proposer_id = NULL`
 * so the chunk owner's audit trail of past suggestions remains
 * intact. The application layer renders such rows as "(deleted
 * user)". `resolver_id` follows the same pattern for the owner who
 * accepted / rejected the request.
 *
 * @design chunkId ON DELETE CASCADE
 * Unlike `position_chunks.chunk_id` which is RESTRICT, edit
 * requests are tied 1:N to a specific chunk and have no value
 * without it. If a chunk is physically deleted (service-role only),
 * the requests go with it.
 *
 * @design no point grant on accept
 * Deliberately omitted in v1. The proposer is doing the chunk
 * owner a favor and a coin grant would be natural, but tying that
 * into the daily creation cap + clawback path is its own slice;
 * defer until the social value of the feature is observed.
 */
export const chunkEditRequests = pgTable(
  'chunk_edit_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => chunks.id, { onDelete: 'cascade' }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL),
    // following the same pattern as `chunks.user_id`.
    proposerId: uuid('proposer_id'),
    /**
     * Proposed new title. Optional — a request may target only the
     * description. When present, validated against the same length /
     * non-empty rules `chunks.title` enforces on the create path.
     */
    proposedTitle: varchar('proposed_title', { length: 255 }),
    /**
     * Proposed new description. Optional — a request may target only
     * the title. Same length cap (5,000 chars) as the create path.
     */
    proposedDescription: text('proposed_description'),
    /**
     * Optional rationale from the proposer (why they suggested this
     * change). Useful for collaborative naming where the *reason* a
     * pattern should be called X is sometimes more important than the
     * name itself. Capped at 2,000 chars by the application layer.
     */
    comment: text('comment'),
    /**
     * Lifecycle: `pending` (default), `accepted`, `rejected`,
     * `withdrawn`. See @design above for transitions.
     */
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    /** Set when the request leaves `pending`. */
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    /**
     * The user who moved the request out of `pending`. For
     * accept / reject this is the chunk owner; for withdraw this is
     * the proposer (equal to `proposer_id`). NULL while pending or
     * after the resolver's account is hard-deleted (FK SET NULL).
     */
    resolverId: uuid('resolver_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    // "List pending requests for this chunk, newest first" — the
    // primary read on the owner's review surface.
    index('idx_chunk_edit_requests_chunk_status_created').on(
      table.chunkId,
      table.status,
      table.createdAt.desc()
    ),
    // "My submitted requests" view for the proposer.
    index('idx_chunk_edit_requests_proposer_created').on(table.proposerId, table.createdAt.desc()),
    // One pending suggestion per (chunk, proposer). The partial
    // predicate `WHERE status = 'pending'` lets resolved rows
    // (accepted / rejected / withdrawn) accumulate freely while the
    // single-pending invariant the UI assumes is enforced by the DB.
    // The application layer reads this row via
    // `getViewerPendingEditRequestForChunk` to hide the form, and
    // catches the 23505 unique-violation as a backstop against
    // tab-race double submits.
    uniqueIndex('uq_chunk_edit_requests_one_pending')
      .on(table.chunkId, table.proposerId)
      .where(sql`status = 'pending'`),
  ]
);

export type ChunkEditRequest = typeof chunkEditRequests.$inferSelect;
export type NewChunkEditRequest = typeof chunkEditRequests.$inferInsert;

/**
 * Chunk Feedback Topics — per-chunk flags marking which fields the author
 * explicitly wants feedback on.
 *
 * @design why a separate table (vs. boolean columns / array on `chunks`)
 * Feedback flags are only meaningful while the chunk is in draft and
 * are dropped on publish. A normalized table makes that lifecycle a
 * single `DELETE WHERE chunk_id = ?` (instead of resetting boolean
 * columns to false, which leaves stale NULL-ish state behind for
 * every published chunk that never used the feature). Sparse-data
 * efficiency: most published chunks carry zero rows; horizontal
 * columns would burn space across every row regardless. The same
 * normalization idiom is used by `likes`, `position_chunks`,
 * `topic_posts`, etc.
 *
 * @design topic as varchar (not pgEnum)
 * Matches `chunks.status` / `topic_posts.topicType` / `moderation_actions.action`:
 * new topics (`fen`, `annotations`, …) can be added without an
 * ALTER TYPE migration. The known-good set is enforced at the
 * application layer in `validateFeedbackTopics`.
 *
 * @design composite primary key
 * No surrogate `id` column — rows are never updated (write strategy
 * is "DELETE all + INSERT new" on every chunk save) and nothing
 * else FKs into this table, so `(chunk_id, topic)` is a sufficient
 * key and the UNIQUE constraint comes for free.
 *
 * @design ON DELETE CASCADE on chunk_id
 * The data has no value once the parent chunk is gone, so CASCADE
 * handles cleanup automatically without a service-role sweep.
 *
 * @design no updated_at
 * Junction-style table convention (see the file-level
 * `@design updated_at update policy` note on `positions`).
 */
export const chunkFeedbackTopics = pgTable(
  'chunk_feedback_topics',
  {
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => chunks.id, { onDelete: 'cascade' }),
    topic: varchar('topic', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.chunkId, table.topic] })]
);

export type ChunkFeedbackTopic = typeof chunkFeedbackTopics.$inferSelect;
export type NewChunkFeedbackTopic = typeof chunkFeedbackTopics.$inferInsert;

/**
 * Position Chunks — junction between memory-type positions and the chunks
 * (piece-coordination patterns) that appear in them.
 *
 * @design catalog-problem association
 * Links memory-type positions to the chunks they contain. A single position
 * may reference multiple chunks (e.g. a board that contains both a
 * fianchetto and a rook battery), and a single chunk may be referenced by
 * many positions. This is the many-to-many table that connects the two.
 *
 * @design created_at present (unlike position_tags)
 * Unlike `position_tags`, this junction carries a `created_at` column. The
 * UGC workflow means users attach chunks to their positions over time
 * rather than all at once, and the attach timestamp is useful for audit
 * trails and for ordering attachments in the UI.
 *
 * @design no display_order
 * A `display_order` column was deliberately omitted. It was debated during
 * design review: the rejected shape was `NOT NULL DEFAULT 0` with no
 * uniqueness constraint, which produces non-deterministic ordering in
 * practice and is YAGNI for the current feature set. Order callers by
 * `created_at` or sort on the application side. A real ordering column can
 * be added later if an actual UX need appears.
 *
 * @design ON DELETE RESTRICT on chunk_id
 * `chunks` uses logical delete (`deletedAt`) as its primary deprecation
 * mechanism, so in normal operation the RESTRICT on `chunk_id` never
 * fires. The RESTRICT exists to intentionally block physical deletes
 * (which are service-role-only) against a chunk that still has junction
 * rows — deleting a referenced chunk requires an explicit cleanup step.
 *
 * Junction tables have no `updated_at` by convention (see the file-level
 * `@design updated_at update policy` note on `positions`).
 */
export const positionChunks = pgTable(
  'position_chunks',
  {
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => chunks.id, { onDelete: 'restrict' }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    // Records who attached the chunk to the position. NULL means the
    // attachment was made by an admin batch / service role rather than an
    // end user. Preserved across user hard-deletes (SET NULL) so the
    // junction row itself isn't broken.
    attachedByUserId: uuid('attached_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.positionId, table.chunkId] }),
    // Reverse lookup index: "positions linking to chunk X".
    index('idx_position_chunks_chunk').on(table.chunkId),
  ]
);

export type PositionChunk = typeof positionChunks.$inferSelect;
export type NewPositionChunk = typeof positionChunks.$inferInsert;

/**
 * Position Edit Requests — Qiita-style suggestions for which chunks a
 * position (memory / puzzle) should link to, from users other than the
 * position's owner.
 *
 * @description
 * A position's set of linked chunks (`position_chunks`) is curated by the
 * owner, but other players often spot a pattern the owner missed ("this
 * board also contains a fianchetto"). This table lets a non-owner propose
 * a new *set* of linked chunks; the owner reviews it and either accepts it
 * (the proposed set replaces the position's links via `replacePositionTags`
 * in the same transaction) or rejects it. Proposers can withdraw their own
 * pending requests.
 *
 * @design scope = chunk links only
 * Unlike `chunk_edit_requests` (which proposes scalar title / description
 * edits), the only thing a position edit request carries is the proposed
 * set of chunk IDs (`proposed_chunk_ids`). Title / description / FEN /
 * puzzle solution are intentionally out of scope for v1.
 *
 * @design proposed_chunk_ids jsonb snapshot
 * The proposal stores an *absolute* set of chunk IDs (not a delta),
 * following the jsonb-set idiom used by `chunks.annotations` and
 * `puzzle_solutions.solution_moves`. On accept the set fully replaces the
 * position's links (DELETE all + INSERT proposed). Because it is an
 * absolute snapshot, accepting is last-writer-wins: if the owner changes
 * the links between propose and accept, accepting overwrites that change.
 * The review UI mitigates this by computing the added / removed diff
 * against the *live* link set at render time, so the owner always sees the
 * true effect of accepting right now. Chunk-set validity (existence,
 * published, non-deleted) cannot live in a CHECK constraint over a jsonb
 * array, so it is re-asserted at the application layer both at submit time
 * and again immediately before the accept-time replace.
 *
 * @design no draft gating
 * Positions have no draft / published lifecycle, so — unlike the chunk
 * variant — submissions and accept / reject are allowed against any
 * non-deleted position. The only gate is `positions.deleted_at`.
 *
 * @design proposer_id / resolver_id nullable + ON DELETE SET NULL
 * Mirrors `chunk_edit_requests`: a hard-deleted proposer / resolver leaves
 * the request intact with the id nulled out so the owner's audit trail
 * survives ("(deleted user)"). FKs defined in custom Supabase SQL.
 *
 * @design positionId ON DELETE CASCADE
 * Edit requests are 1:N to a position and have no value without it; a
 * physical position delete (service-role only) takes its requests with it.
 */
export const positionEditRequests = pgTable(
  'position_edit_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL),
    // following the same pattern as `chunk_edit_requests.proposer_id`.
    proposerId: uuid('proposer_id'),
    /**
     * The proposed set of linked chunk IDs (absolute snapshot, not a
     * delta). Validated at the application layer against published,
     * non-deleted chunks. An empty array is a legitimate proposal
     * ("remove all chunk links").
     */
    proposedChunkIds: jsonb('proposed_chunk_ids').$type<string[]>().notNull().default([]),
    /**
     * Optional rationale from the proposer (why these chunks belong on
     * this position). Capped at 2,000 chars by the application layer.
     */
    comment: text('comment'),
    /**
     * Lifecycle: `pending` (default), `accepted`, `rejected`,
     * `withdrawn`. All terminal states are immutable; idempotent at the
     * application layer.
     */
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    /** Set when the request leaves `pending`. */
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    /**
     * The user who moved the request out of `pending`. For accept /
     * reject this is the position owner; for withdraw this is the
     * proposer. NULL while pending or after the resolver's account is
     * hard-deleted (FK SET NULL).
     */
    resolverId: uuid('resolver_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    // "List pending requests for this position, newest first" — the
    // primary read on the owner's review surface.
    index('idx_position_edit_requests_position_status_created').on(
      table.positionId,
      table.status,
      table.createdAt.desc()
    ),
    // "My submitted requests" view for the proposer.
    index('idx_position_edit_requests_proposer_created').on(
      table.proposerId,
      table.createdAt.desc()
    ),
    // One pending suggestion per (position, proposer). The partial
    // predicate lets resolved rows accumulate freely while the single-
    // pending invariant the UI assumes is enforced by the DB; the
    // application layer reads it via `getViewerPendingEditRequestForPosition`
    // and catches the 23505 unique-violation as a tab-race backstop.
    uniqueIndex('uq_position_edit_requests_one_pending')
      .on(table.positionId, table.proposerId)
      .where(sql`status = 'pending'`),
  ]
);

export type PositionEditRequest = typeof positionEditRequests.$inferSelect;
export type NewPositionEditRequest = typeof positionEditRequests.$inferInsert;

/**
 * Position Themes — junction between positions and the glossary terms
 * (themes) that describe them.
 *
 * @design master-vocabulary tag, mirror of position_chunks
 * Where `position_chunks` attaches user-generated cognitive units (UGC)
 * to a position, `position_themes` attaches curated vocabulary terms
 * from `glossary_terms` (e.g. pin, passed pawn, battery, kingside
 * attack). The two junctions share the same shape but live in different
 * lifecycles: chunks are created by users; themes are seeded master data
 * and tagged to positions through admin curation (initially) and
 * eventually by position owners and other-user proposals.
 *
 * Two separate junctions (rather than a polymorphic `position_tags`
 * table) keep referential integrity strict, simplify RLS, and let each
 * side evolve its lifecycle (visibility, voting, proposals) without
 * affecting the other.
 *
 * @design ON DELETE RESTRICT on term_id
 * Glossary terms are seeded master data and are not normally deleted.
 * The RESTRICT on `term_id` blocks accidental physical deletion of a
 * term that still has positions tagged with it; intentional removal
 * requires an explicit cleanup step (untag first, then delete).
 *
 * @design is_theme gate enforced in RLS
 * Only `glossary_terms` rows with `is_theme = true` are valid theme
 * tags. The application's theme picker filters on `is_theme = true`,
 * and the `position_themes` INSERT RLS policy re-asserts the same
 * predicate so the rule is enforced at the DB level rather than only in
 * the UI.
 *
 * Junction tables have no `updated_at` by convention (see the
 * file-level `@design updated_at update policy` note on `positions`).
 */
export const positionThemes = pgTable(
  'position_themes',
  {
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
    termId: uuid('term_id')
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: 'restrict' }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    // NULL means the tag was attached by an admin batch / service role.
    attachedByUserId: uuid('attached_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.positionId, table.termId] }),
    // Reverse lookup index: "positions tagged with term X".
    index('idx_position_themes_term').on(table.termId),
  ]
);

export type PositionTheme = typeof positionThemes.$inferSelect;
export type NewPositionTheme = typeof positionThemes.$inferInsert;

// Re-exported so existing imports of `PuzzleSolutionMove` from
// '@/lib/db/schema/positions' keep working after the puzzles split.
export type { PuzzleSolutionMove } from './puzzles';
