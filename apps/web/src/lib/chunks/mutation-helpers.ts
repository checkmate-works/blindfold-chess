import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';

import type { ChunkMutationData } from './validation';

/**
 * Trim and project shared chunk fields used by both create and update
 * paths. The admin form validates trimmed values, so the same trimming is
 * applied here to keep stored data consistent regardless of incidental
 * whitespace.
 *
 * `userId` is included in both modes. On update, this preserves the admin
 * tool's ability to reassign author; the UGC mutation layer overwrites
 * `data.userId` with the authenticated user before calling this helper,
 * so the column is rewritten to the same value it already holds — a
 * harmless no-op for self-edits.
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
 * caller (admin / UGC create) must have validated its presence and shape
 * via `validateChunkMutationData(data, 'create')` first.
 *
 * `status` falls back to `'published'` when the caller omits it so the
 * legacy admin create flow — which has no draft toggle — preserves its
 * prior behavior. The UGC entry point explicitly sets it from user input.
 */
export function buildChunkCreateValues(data: ChunkMutationData) {
  return {
    ...buildSharedChunkValues(data),
    slug: (data.slug ?? '').trim(),
    status: data.status ?? 'published',
  };
}

/**
 * Build the column values for the UPDATE path. Slug is intentionally
 * omitted — chunk slugs are public catalog URLs and `topic_posts.topic_key`
 * for the chunk's discussion thread, so the application layer treats them
 * as permanent identifiers. Drizzle's `.set({...})` therefore leaves the
 * slug column untouched on every update.
 */
export function buildChunkUpdateValues(data: ChunkMutationData) {
  return buildSharedChunkValues(data);
}

/**
 * @deprecated Use `buildChunkCreateValues` / `buildChunkUpdateValues`
 * directly. Retained transitionally so existing import sites keep
 * compiling; will be removed once those are migrated.
 */
export function buildChunkMutationValues(data: ChunkMutationData) {
  return buildChunkCreateValues(data);
}

/**
 * Confirm the supplied `userId` resolves to a row in `profiles`.
 *
 * Both `createChunk` and `updateChunk` accept the author id from the admin
 * form, so the existence check guards against a typo or stale UI state from
 * persisting an orphan FK reference.
 */
export async function verifyChunkAuthor(userId: string): Promise<{ error: string } | null> {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, userId.trim()))
    .limit(1);

  return profile ? null : { error: 'User not found' };
}
