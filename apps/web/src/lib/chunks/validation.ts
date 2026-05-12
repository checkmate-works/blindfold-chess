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
 * Practical upper bound for `chunks.description`. The DB column is `text`
 * (no length constraint), but the admin form should still refuse pathological
 * inputs. 5,000 chars comfortably covers long annotations while still being
 * safe to render in the admin UI.
 */
const CHUNK_DESCRIPTION_MAX_LENGTH = 5000;

export type ChunkMutationData = {
  representativeFen: string;
  title: string;
  slug: string;
  description?: string | null;
  userId: string;
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
};

/**
 * Validate chunk mutation data before persisting. Used by both create and
 * update Server Actions.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 */
export function validateChunkMutationData(data: ChunkMutationData): string | null {
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

  if (!data.slug || !data.slug.trim()) {
    return 'Slug is required';
  }

  if (data.slug.trim().length > CHUNK_SLUG_MAX_LENGTH) {
    return `Slug must be ${CHUNK_SLUG_MAX_LENGTH} characters or fewer`;
  }

  if (!CHUNK_SLUG_PATTERN.test(data.slug.trim())) {
    return 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. "rook-battery")';
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

  return null;
}
