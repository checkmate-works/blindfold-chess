'use server';

import { findChunkBySlug } from '@/lib/chunks/queries';

/**
 * Is this slug still free to mint?
 *
 * Preflight for the authoring form's submit gate only — the DB UNIQUE on
 * `chunks.slug` remains the canonical guarantee, and both write paths
 * translate PG 23505 into `slugTaken` (see `user-chunk-mutations.ts`). The
 * point of asking here is timing: without it the collision is only reported
 * by the preview's Confirm, several steps after the field that caused it,
 * where the author can no longer see the input they have to change.
 *
 * `findChunkBySlug` matches soft-deleted rows too, exactly like the
 * server-side check — the unique index has no `WHERE deleted_at IS NULL`
 * clause, so a slug stays reserved once minted.
 *
 * Deliberately unauthenticated: chunk slugs are public catalog URLs and
 * the listing page enumerates them anyway, so the answer leaks nothing a
 * `GET /chunks/<slug>` would not.
 */
export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  return { available: !(await findChunkBySlug(slug)) };
}
