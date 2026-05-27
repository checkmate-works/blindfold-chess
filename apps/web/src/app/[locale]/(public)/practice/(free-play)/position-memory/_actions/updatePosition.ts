'use server';

import { updatePositionEntry } from '@/lib/positions/user-position-mutations';
import { validatePositionMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type UpdatePositionResult = { success: true } | { error: string };

export async function updatePosition(data: {
  id: string;
  fen: string;
  title: string;
  description?: string | null;
  /**
   * When provided (even as []) replaces the position's theme tags.
   * Omit to leave existing tags untouched.
   */
  themeIds?: string[];
  /**
   * When provided (even as []) replaces the position's chunk tags.
   * Omit to leave existing tags untouched.
   */
  chunkIds?: string[];
}): Promise<UpdatePositionResult> {
  return updatePositionEntry({
    kind: 'memory',
    rateLimit: RATE_LIMITS.updatePosition,
    data: {
      id: data.id,
      fen: data.fen,
      title: data.title,
      description: data.description,
      themeIds: data.themeIds,
      chunkIds: data.chunkIds,
    },
    validate: (userId) =>
      validatePositionMutationData({
        fen: data.fen,
        title: data.title,
        description: data.description,
        userId,
      }),
  });
}
