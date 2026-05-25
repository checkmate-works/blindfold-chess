import { validateFenStructure } from '@blindfold-chess/features/chess-core';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Maximum length of `chunks.title`. Must match the `varchar(255)` declared in
 * `src/lib/db/schema/tables.ts`.
 */
export const CHUNK_TITLE_MAX_LENGTH = 255;

/**
 * Maximum length of `chunks.slug`. The DB column is `varchar(255)` (see
 * `src/lib/db/schema/tables.ts`), but discussions about a chunk are stored
 * in `topic_posts` with `topic_key=chunk.slug`, and `topic_posts.topic_key`
 * is `varchar(50)`. The application-layer cap below the column width keeps
 * every chunk slug round-trippable through the topic_posts storage path.
 *
 * Lowering the column itself was deliberately rejected — it would invalidate
 * any existing chunk that happens to exceed 50 chars. The check is therefore
 * applied only on new submissions via `validateChunkMutationData`.
 */
export const CHUNK_SLUG_MAX_LENGTH = 50;

/**
 * Valid slug pattern: lowercase alphanumeric segments separated by single
 * hyphens. No leading/trailing hyphens, no consecutive hyphens.
 */
const CHUNK_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Best-effort slug suggestion from a free-form title. Lowercases, collapses
 * whitespace and any non-`[a-z0-9-]` characters into hyphens, then trims
 * stray delimiters. The output may still fail `CHUNK_SLUG_PATTERN` for
 * pathological inputs (e.g. an all-symbol title yields `""`), so callers
 * MUST treat the result as a *suggestion* and re-run the form's own
 * validation before submission.
 */
export function deriveSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Practical upper bound for `chunks.description`. The DB column is `text`
 * (no length constraint), but the admin form should still refuse pathological
 * inputs. 5,000 chars comfortably covers long annotations while still being
 * safe to render in the admin UI.
 */
const CHUNK_DESCRIPTION_MAX_LENGTH = 5000;

export type ChunkMutationMode = 'create' | 'update';

/**
 * Lifecycle states for a `chunks` row. See the `chunks.status` schema
 * TSDoc for the design rationale; this file owns the runtime guard
 * (`isChunkStatus`) and the type used by the mutation layer.
 *
 * Kept narrow on purpose — new states (`archived`, `deprecated`, …)
 * should be added here AND surfaced in the schema column comment so
 * the application layer and the migration story stay in sync.
 */
export const CHUNK_STATUSES = ['draft', 'published'] as const;
export type ChunkStatus = (typeof CHUNK_STATUSES)[number];

export function isChunkStatus(value: unknown): value is ChunkStatus {
  return typeof value === 'string' && (CHUNK_STATUSES as readonly string[]).includes(value);
}

/**
 * Known set of fields a chunk author can request feedback on while the
 * chunk is in draft. Mirrors the `chunk_feedback_topics.topic` column;
 * the DB stores it as `varchar(50)` so adding a new topic (e.g. `fen`
 * or `annotations`) is just a code change — no migration.
 *
 * The application layer is the single source of truth for the
 * known-good set: `validateFeedbackTopics` rejects anything outside
 * this list before it reaches the INSERT.
 */
export const CHUNK_FEEDBACK_TOPICS = ['title', 'description'] as const;
export type ChunkFeedbackTopic = (typeof CHUNK_FEEDBACK_TOPICS)[number];

export function isChunkFeedbackTopic(value: unknown): value is ChunkFeedbackTopic {
  return typeof value === 'string' && (CHUNK_FEEDBACK_TOPICS as readonly string[]).includes(value);
}

/**
 * Normalize an arbitrary input list to a deduplicated, sorted array of
 * known feedback topics. Returns `null` when the input contains any
 * unknown value — callers map this to a validation error.
 *
 * Sorted output makes downstream comparisons stable (tests, snapshots,
 * and the "no-op update" path in the mutation layer).
 */
export function parseFeedbackTopics(input: unknown): ChunkFeedbackTopic[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return null;
  const out = new Set<ChunkFeedbackTopic>();
  for (const item of input) {
    if (!isChunkFeedbackTopic(item)) return null;
    out.add(item);
  }
  return [...out].sort();
}

export type ChunkMutationData = {
  representativeFen: string;
  title: string;
  /**
   * Required on create, ignored on update. Chunk slugs become public
   * catalog URLs (`/chunks/<slug>`) and are also the `topic_posts.topic_key`
   * for the discussion thread — both contracts make slugs effectively
   * permanent identifiers, so the application layer treats them as
   * immutable after creation. `validateChunkMutationData` only checks slug
   * shape when `mode='create'`; `buildChunkMutationValues` only emits the
   * `slug` column on create. The admin form keeps the field visible on
   * edit for context but no longer writes through it.
   */
  slug?: string;
  description?: string | null;
  userId: string;
  /**
   * Lifecycle state for the row. Optional in the payload so legacy
   * callers (e.g. the admin create form, which has no draft concept
   * yet) keep compiling without changes — `buildChunkCreateValues`
   * substitutes `'published'` when omitted. Status transitions on an
   * existing row go through the dedicated `publishChunkEntry` /
   * `unpublishChunkEntry` Server Actions, not the general update path,
   * so the column is intentionally NOT emitted by
   * `buildChunkUpdateValues`.
   */
  status?: ChunkStatus;
  /**
   * Optional display-only annotations. Omitted by callers that don't need
   * to set or change them (the DB column has a NOT NULL DEFAULT of the
   * empty singleton, so omission preserves whatever was previously stored
   * on UPDATE and writes the empty shape on INSERT). The shape is trusted
   * here — runtime validation lives in `parseBoardAnnotations` on the
   * read path, and the editor produces well-typed objects via
   * `toggleArrow`/`toggleCircle`.
   */
  annotations?: BoardAnnotations;
  /**
   * Fields the author wants targeted feedback on while the chunk is in
   * draft. Persisted to `chunk_feedback_topics` as one row per topic.
   * Ignored when the resulting chunk status is not `'draft'`; clearing
   * the array on a draft save removes any previously-set rows. Unknown
   * values are rejected by `validateChunkMutationData` (the contents are
   * pre-validated via `parseFeedbackTopics`, but the mutation layer
   * defends against direct construction of `ChunkMutationData`).
   */
  feedbackTopics?: readonly ChunkFeedbackTopic[];
};

/**
 * Validate chunk mutation data before persisting. Used by both create and
 * update Server Actions.
 *
 * Slug is **required** on `mode='create'`. On `mode='update'` the slug is
 * **optional**: omitting it preserves the existing value, supplying it
 * triggers a slug rename (only allowed while the chunk is in draft —
 * the mutation layer also gates and cascades to `topic_posts.topic_key`).
 * Either way the shape rules are enforced when a value is present.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 */
export function validateChunkMutationData(
  data: ChunkMutationData,
  mode: ChunkMutationMode = 'create'
): string | null {
  if (!data.representativeFen || !data.representativeFen.trim()) {
    return 'Representative FEN is required';
  }

  // Use `validateFenStructure` (chess.js-free) rather than the chess.js-backed
  // `validateFen` here. Chunks are piece-coordination *patterns* — e.g. a
  // rook battery or a kingside fianchetto — so a representative FEN may
  // legitimately omit kings or contain arbitrary subsets of pieces. chess.js
  // enforces legal-position invariants (two kings, no pawns on rank 1/8, etc.)
  // that would reject perfectly valid chunk patterns. Here we only check that
  // the FEN is structurally well-formed.
  const fenResult = validateFenStructure(data.representativeFen.trim());
  if (!fenResult.ok) {
    return `Invalid FEN structure: ${fenResult.error ?? 'malformed FEN'}`;
  }

  if (!data.title || !data.title.trim()) {
    return 'Title is required';
  }

  if (data.title.trim().length > CHUNK_TITLE_MAX_LENGTH) {
    return `Title must be ${CHUNK_TITLE_MAX_LENGTH} characters or fewer`;
  }

  const slugSupplied = typeof data.slug === 'string' && data.slug.trim().length > 0;

  if (mode === 'create' && !slugSupplied) {
    return 'Slug is required';
  }

  if (slugSupplied) {
    const trimmedSlug = data.slug!.trim();
    if (trimmedSlug.length > CHUNK_SLUG_MAX_LENGTH) {
      return `Slug must be ${CHUNK_SLUG_MAX_LENGTH} characters or fewer`;
    }
    if (!CHUNK_SLUG_PATTERN.test(trimmedSlug)) {
      return 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. "rook-battery")';
    }
  }

  if (data.description && data.description.trim().length > CHUNK_DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${CHUNK_DESCRIPTION_MAX_LENGTH} characters or fewer`;
  }

  if (!data.userId || !data.userId.trim()) {
    return 'User ID is required';
  }

  if (!UUID_RE.test(data.userId.trim())) {
    return 'Invalid User ID format (expected UUID)';
  }

  if (data.status !== undefined && !isChunkStatus(data.status)) {
    return `Invalid status (expected one of: ${CHUNK_STATUSES.join(', ')})`;
  }

  if (data.feedbackTopics !== undefined) {
    for (const topic of data.feedbackTopics) {
      if (!isChunkFeedbackTopic(topic)) {
        return `Invalid feedback topic (expected one of: ${CHUNK_FEEDBACK_TOPICS.join(', ')})`;
      }
    }
  }

  return null;
}
