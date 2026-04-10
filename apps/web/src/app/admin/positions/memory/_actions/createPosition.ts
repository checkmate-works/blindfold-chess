'use server';

import { adminMutationGuard, mutationSuccess } from '@/app/admin/_lib/action-factories';
import type { MutationResult } from '@/app/admin/_lib/action-factories';

import { db, feedItems, positions } from '@/lib/db';
import type { PositionMutationData } from '@/lib/positions/validation';
import { validatePositionMutationData } from '@/lib/positions/validation';

export async function createPosition(data: PositionMutationData): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validatePositionMutationData);
  if (guard) {
    return guard;
  }

  const userId = data.userId.trim();

  const inserted = await db.transaction(async (tx) => {
    const [position] = await tx
      .insert(positions)
      .values({
        fen: data.fen.trim(),
        title: data.title.trim(),
        description: data.description?.trim() || null,
        userId,
        type: 'memory',
      })
      .returning({ id: positions.id });

    await tx.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: userId,
      metadata: { type: 'memory' },
    });

    return position;
  });

  return mutationSuccess(inserted.id, '/admin/positions/memory');
}
