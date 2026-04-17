'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions, puzzleSolutions } from '@/lib/db';
import { validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type CreatePuzzleResult = { success: true; id: string } | { error: string };

export async function createPuzzle(data: {
  fen: string;
  title: string;
  description?: string | null;
  solutionLine: string;
}): Promise<CreatePuzzleResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.createPuzzle);

  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const { user } = guardResult;

  const validationError = validatePuzzleMutationData({
    fen: data.fen,
    title: data.title,
    description: data.description,
    solutionLine: data.solutionLine,
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
        type: 'puzzle',
      })
      .returning({ id: positions.id });

    await tx.insert(puzzleSolutions).values({
      positionId: position.id,
      solutionLine: data.solutionLine.trim(),
    });

    await tx.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: user.id,
      metadata: { type: 'puzzle' },
    });

    return position;
  });

  revalidatePath('/practice/puzzle');

  return { success: true, id: inserted.id };
}
