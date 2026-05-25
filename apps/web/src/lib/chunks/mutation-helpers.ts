import type { ChunkMutationData } from './validation';

/**
 * Trim and project shared chunk fields used by both create and update
 * paths. Trimming here mirrors what `validateChunkMutationData` accepted,
 * so the stored row is consistent regardless of incidental whitespace
 * the form forwarded.
 *
 * `userId` is included in both modes. The UGC mutation layer overwrites
 * `data.userId` with the authenticated user before calling this helper,
 * so on UPDATE the column is rewritten to the same value it already
 * holds — a harmless no-op for self-edits.
 *
 * `annotations` is forwarded verbatim. Drizzle treats `undefined` as "do
 * not set this column", so omitting it from the payload preserves
 * existing values on UPDATE and falls back to the DB default
 * (`{arrows:[], circles:[]}`) on INSERT.
 */
function buildSharedChunkValues(data: ChunkMutationData) {
  return {
    representativeFen: data.representativeFen.trim(),
    title: data.title.trim(),
    description: data.description?.trim() || null,
    userId: data.userId.trim(),
    annotations: data.annotations,
  };
}

/**
 * Build the column values for the INSERT path. Requires `slug` — the
 * caller (UGC create) must have validated its presence and shape via
 * `validateChunkMutationData(data, 'create')` first.
 *
 * `status` falls back to `'published'` when the caller omits it. The
 * UGC entry point explicitly sets it from user input.
 */
export function buildChunkCreateValues(data: ChunkMutationData) {
  return {
    ...buildSharedChunkValues(data),
    slug: (data.slug ?? '').trim(),
    status: data.status ?? 'published',
  };
}

/**
 * Build the column values for the UPDATE path. Slug is conditionally
 * included: omitted when the caller passes no slug (drizzle treats
 * `undefined` as "skip column", so the existing value is preserved),
 * trimmed and included when a new slug is supplied — only allowed
 * while the chunk is in draft, gated by `updateChunkEntry`. The
 * mutation layer is also responsible for cascading slug renames to
 * `topic_posts.topic_key` for chunk-typed discussions.
 *
 * Slug remains immutable on published chunks because the URL and the
 * topic_key contract have been exposed to other users; the gate lives
 * in `updateChunkEntry` so the helper itself stays trivial.
 */
export function buildChunkUpdateValues(data: ChunkMutationData) {
  const base = buildSharedChunkValues(data);
  const trimmedSlug = data.slug?.trim();
  return trimmedSlug ? { ...base, slug: trimmedSlug } : base;
}
