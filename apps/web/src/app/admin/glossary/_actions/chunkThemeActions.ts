'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq } from 'drizzle-orm';

import { chunkThemes, db } from '@/lib/db';
import { searchChunksForLinker } from '@/lib/glossary-admin/queries';
import type { ChunkSearchResult } from '@/lib/glossary-admin/queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function linkChunkToTerm(
  termId: string,
  chunkId: string,
  termSlug: string
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  if (!isValidUuid(termId) || !isValidUuid(chunkId)) {
    return { error: 'Invalid UUID format' };
  }

  await db
    .insert(chunkThemes)
    .values({ termId, chunkId, attachedByUserId: auth.userId })
    .onConflictDoNothing();

  // Both the admin editor and the public term page (once added) depend on
  // this junction, so invalidate the admin path now and let any future
  // public page take care of its own revalidation tag.
  revalidatePath(`/admin/glossary/${termSlug}`);
  return { success: true };
}

export async function unlinkChunkFromTerm(
  termId: string,
  chunkId: string,
  termSlug: string
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  if (!isValidUuid(termId) || !isValidUuid(chunkId)) {
    return { error: 'Invalid UUID format' };
  }

  await db
    .delete(chunkThemes)
    .where(and(eq(chunkThemes.termId, termId), eq(chunkThemes.chunkId, chunkId)));

  revalidatePath(`/admin/glossary/${termSlug}`);
  return { success: true };
}

export async function searchChunksAction(
  query: string,
  excludeIds: string[]
): Promise<ChunkSearchResult[]> {
  const auth = await requireAdmin();
  if ('error' in auth) return [];

  return searchChunksForLinker(query, excludeIds);
}
