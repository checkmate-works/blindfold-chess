import { eq } from 'drizzle-orm';

import { chunks, db } from '@/lib/db';
import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';

export type ToggleChunkLikeResult = ToggleLikeResult;

/**
 * Core implementation of the "toggle like" operation for a chunk entity.
 *
 * Thin wrapper around `performEntityToggleLike` — the orchestration
 * skeleton (auth + ban + rate-limit + DB toggle + notify) lives in
 * `@/lib/db/like-actions`, and this file supplies only the chunk-specific
 * owner lookup and notification metadata.
 *
 * The "like a comment in the chunk thread" path is separate and lives at
 * `(public)/chunks/[slug]/_actions/toggleChunkLike.ts` (which delegates
 * to the topic_posts-level `toggleLikeBase`).
 *
 * Plain (non-`"use server"`) module so the thin Server Action wrappers
 * in `/chunks/_actions/...` can `import` it without violating the
 * "only async function declarations may be exported" rule.
 */
export async function toggleChunkLikeBase(
  chunkId: string,
  _locale: string
): Promise<ToggleChunkLikeResult> {
  return performEntityToggleLike<{ slug: string }>({
    id: chunkId,
    fieldName: 'chunkId',
    targetType: 'chunk',
    fetchOwner: async (id) => {
      const [row] = await db
        .select({ userId: chunks.userId, slug: chunks.slug })
        .from(chunks)
        .where(eq(chunks.id, id))
        .limit(1);
      if (!row) return null;
      return { userId: row.userId, extra: { slug: row.slug } };
    },
    notificationMeta: (chunkId, { slug }) => ({ chunkId, slug }),
  });
}
