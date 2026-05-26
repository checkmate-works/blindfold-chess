import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { chunks, db } from '@/lib/db';
import { toggleLikeForTarget } from '@/lib/db/like-actions';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateUUID } from '@/lib/validations/uuid';

export type ToggleChunkLikeResult = { liked: boolean; likeCount: number } | { error: string };

/**
 * Core implementation of the "toggle like" operation for a chunk entity.
 *
 * Mirrors {@link togglePositionLike} (positions/like-actions.ts) — same
 * auth + rate-limit guard, polymorphic `toggleLikeForTarget('chunk', id)`
 * write, optional follow-up notification on a fresh like to the chunk's
 * author. The "like a comment in the chunk thread" path is separate and
 * lives at `(public)/chunks/[slug]/_actions/toggleChunkLike.ts` (which
 * delegates to the topic_posts-level `toggleLikeBase`).
 *
 * Plain (non-`"use server"`) module so the thin Server Action wrapper at
 * `/chunks/_actions/toggleLike.ts` can re-export it without violating the
 * "only async function declarations may be exported" rule.
 */
export async function toggleChunkLikeBase(
  chunkId: string,
  locale: string
): Promise<ToggleChunkLikeResult> {
  const uuidError = validateUUID(chunkId, 'chunkId');
  if (uuidError) return uuidError;

  const guardResult = await authenticateAndGuard(RATE_LIMITS.toggleLike);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const { liked, likeCount } = await toggleLikeForTarget({
    userId: user.id,
    targetType: 'chunk',
    targetId: chunkId,
  });

  const [chunk] = await db
    .select({ userId: chunks.userId, slug: chunks.slug })
    .from(chunks)
    .where(eq(chunks.id, chunkId))
    .limit(1);

  if (liked && chunk && chunk.userId && chunk.userId !== user.id) {
    createNotification({
      userId: chunk.userId,
      actorId: user.id,
      type: 'like',
      targetType: 'chunk',
      targetId: chunkId,
      metadata: { chunkId, slug: chunk.slug },
    });
  }

  revalidatePath(`/${locale}/chunks`);
  if (chunk) {
    revalidatePath(`/${locale}/chunks/${chunk.slug}`);
  }

  return { liked, likeCount };
}
