// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — positions.
//
// Practice positions, position tags, the position edit-request workflow, and
// the position ↔ chunk and position ↔ glossary-theme join tables. The chunks
// domain itself (chunks, chunk_edit_requests, chunk_feedback_topics) lives in
// ./chunks since 2026-07-04. Cross-imports `tags` from ./articles
// (positionTags), `chunks` from ./chunks (positionChunks), and `glossaryTerms`
// from ./glossary (positionThemes) — all `references()` clauses survive the
// split because Drizzle resolves them at runtime.
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

import { tags } from './articles';
import { chunks } from './chunks';
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
    // Nullable: positions are a public catalog, so author deletion anonymises
    // (FK ON DELETE SET NULL) rather than cascading the row away — mirrors
    // `games.author_id` / `chunks.user_id`. The app renders NULL as
    // "(deleted user)". FK defined in custom SQL.
    userId: uuid('user_id'), // references auth.users — FK defined in custom SQL
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
     * Snapshot of the position's linked-chunk set at the moment the
     * request was resolved (captured pre-apply on accept). NULL while
     * pending.
     *
     * @design why snapshot the base set
     * The review UI computes a pending request's added / removed diff
     * against the *live* link set so the owner sees the true effect of
     * accepting right now. But once a request is accepted that live set
     * becomes the proposed set, so a live-computed diff for a resolved
     * row would collapse to "no change" and the history would not show
     * what the acceptance actually added / removed. Storing the base set
     * at resolution time lets the history render a stable
     * `proposed vs base` diff for resolved rows. Rejected / withdrawn
     * rows capture the base too, so their history shows what they would
     * have changed at the time they were closed.
     */
    resolvedBaseChunkIds: jsonb('resolved_base_chunk_ids').$type<string[]>(),
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

/**
 * Position Content Revisions — append-only trail of an owner's own edits to
 * a position's authored content (title / FEN / description / puzzle
 * solution moves).
 *
 * @description
 * `positions` (and its sibling `puzzle_solutions`) keep no revision history
 * of their own — an edit overwrites the row in place. This table is the
 * durable, user-facing record of what changed: one row per successful edit
 * that actually changed at least one field, written in the same transaction
 * as the `positions` UPDATE so it can never drift from what's live.
 *
 * @design not the same thing as `user_activity_log`
 * `user_activity_log` already captures a similar `{field: {from, to}}` shape
 * for `fen` / `title` / `description`, but it is fire-and-forget (errors are
 * swallowed — see its own `@design` note, "NOT a trustworthy audit trail"),
 * admin-only, and never captures `puzzle_solutions` changes. This table is
 * the opposite on all three counts: written transactionally, public-facing,
 * and covers solution moves too. The two tables intentionally overlap in
 * content for edits to `fen`/`title`/`description` — that duplication buys
 * the admin log its own independent, best-effort-only failure mode without
 * coupling it to a user-facing feature's reliability requirements.
 *
 * @design `changes` shape
 * `{ [field]: { from, to } }`, reusing the same shape `diffFields()`
 * produces for the activity log. `field` is one of `fen` / `title` /
 * `description` (values are `string | null`) or `solutionMoves` (values are
 * `PuzzleSolutionMove[][]` — one array per alternative-solution row, to
 * match how `puzzle_solutions` can hold more than one row per position).
 * Only fields that actually changed are present; a row is only ever
 * inserted when `changes` is non-empty.
 *
 * @design editor_id nullable + ON DELETE SET NULL
 * Only the position's owner can edit its content today (see
 * `position_edit_requests` — third parties may only propose chunk-tag
 * changes), so `editorId` is always the owner at insert time. It is kept as
 * its own column (rather than assumed-equal to `positions.user_id`) so nothing
 * here has to change if a future edit-request flow adds a real "apply a
 * third party's accepted proposal" writer. Nulled on hard-delete, mirroring
 * `positions.user_id`, so the row (and the fact that *someone* made this
 * edit) survives.
 *
 * @design positionId ON DELETE CASCADE, no updated_at
 * Revisions are 1:N to a position and have no meaning without it. Append-
 * only by design (mirrors `user_activity_log` / `moderation_actions`), so
 * there is nothing for `updated_at` to track.
 */
export const positionContentRevisions = pgTable(
  'position_content_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
    // references auth.users — FK defined in custom SQL (ON DELETE SET NULL).
    editorId: uuid('editor_id'),
    changes: jsonb('changes').$type<Record<string, { from: unknown; to: unknown }>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // "Show this position's edit history, newest first" — the only read
    // pattern this table serves.
    index('idx_position_content_revisions_position_created').on(
      table.positionId,
      table.createdAt.desc()
    ),
  ]
);

export type PositionContentRevision = typeof positionContentRevisions.$inferSelect;
export type NewPositionContentRevision = typeof positionContentRevisions.$inferInsert;

// Re-exported so existing imports of `PuzzleSolutionMove` from
// '@/lib/db/schema/positions' keep working after the puzzles split.
export type { PuzzleSolutionMove } from './puzzles';
