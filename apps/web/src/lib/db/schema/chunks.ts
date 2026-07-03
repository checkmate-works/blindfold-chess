// Split from schema/positions.ts on 2026-07-04. Per-domain
// schema slice — chunks.
//
// Knowledge chunks (the curriculum building block): the `chunks` catalog,
// the Qiita-style `chunk_edit_requests` workflow, and per-chunk
// `chunk_feedback_topics` flags. The position ↔ chunk join table
// (`position_chunks`) stays with the positions slice.
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { BoardAnnotations } from '@/lib/board-annotations/types';

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
