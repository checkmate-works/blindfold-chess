'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions } from '@/lib/db';
import { validatePositionMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type CreatePositionResult = { success: true; id: string } | { error: string };

export async function createPosition(data: {
  fen: string;
  title: string;
  description?: string | null;
}): Promise<CreatePositionResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.createPosition);

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

  const inserted = await db.transaction(async (tx) => {
    const [position] = await tx
      .insert(positions)
      .values({
        fen: data.fen.trim(),
        title: data.title.trim(),
        description: data.description?.trim() || null,
        userId: user.id,
        type: 'memory',
      })
      .returning({ id: positions.id });

    await tx.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: user.id,
      metadata: { type: 'memory' },
    });

    return position;
  });

  revalidatePath('/practice/position-memory');

  return { success: true, id: inserted.id };
}
