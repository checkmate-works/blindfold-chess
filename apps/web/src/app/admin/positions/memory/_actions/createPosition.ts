'use server';

import { adminMutationGuard, mutationSuccess } from '@/app/admin/_lib/action-factories';
import type { MutationResult } from '@/app/admin/_lib/action-factories';

import { db, positions } from '@/lib/db';

import type { PositionMutationData } from '../_lib/types';
import { validatePositionData } from '../_lib/validation';

export async function createPosition(data: PositionMutationData): Promise<MutationResult> {
  const guard = await adminMutationGuard(data, validatePositionData);
  if (guard) {
    return guard;
  }

  const [inserted] = await db
    .insert(positions)
    .values({
      fen: data.fen.trim(),
      title: data.title.trim(),
      description: data.description?.trim() || null,
      userId: data.userId.trim(),
      type: 'memory',
    })
    .returning({ id: positions.id });

  return mutationSuccess(inserted.id, '/admin/positions/memory');
}
