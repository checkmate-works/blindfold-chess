'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { validatePositionMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type UpdatePositionResult = { success: true } | { error: string };

export async function updatePosition(data: {
  id: string;
  fen: string;
  title: string;
  description?: string | null;
}): Promise<UpdatePositionResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.updatePosition);

  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const { user } = guardResult;

  const validationError = validatePositionMutationData({
    fen: data.fen,
    title: data.title,
    description: data.description,
    userId: user.id,
  });

  if (validationError) {
    return { error: validationError };
  }

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, data.id))
    .limit(1);

  if (!position || position.type !== 'memory') {
    return { error: 'notFound' };
  }

  if (position.userId !== user.id) {
    return { error: 'unauthorized' };
  }

  if (position.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  await db
    .update(positions)
    .set({
      fen: data.fen.trim(),
      title: data.title.trim(),
      description: data.description?.trim() || null,
    })
    .where(
      and(eq(positions.id, data.id), eq(positions.userId, user.id), isNull(positions.deletedAt))
    );

  revalidatePath('/practice/position-memory');
  revalidatePath(`/practice/position-memory/${data.id}`);

  return { success: true };
}
