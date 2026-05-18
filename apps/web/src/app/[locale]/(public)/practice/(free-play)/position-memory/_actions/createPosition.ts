'use server';

import type { CreatePositionEntryResult } from '@/lib/positions/user-position-mutations';
import { createPositionEntry } from '@/lib/positions/user-position-mutations';
import { validatePositionMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type CreatePositionResult = CreatePositionEntryResult;

export async function createPosition(data: {
  fen: string;
  title: string;
  description?: string | null;
  themeIds?: string[];
  chunkIds?: string[];
  /**
   * When forking from an existing position-memory entry, the id of the
   * source row. Validated against the database (must exist, share
   * `type='memory'`, not be soft-deleted, not be owned by the current
   * user, and not have `forks_disabled_at` set) before the insert begins.
   */
  forkedFromId?: string | null;
}): Promise<CreatePositionResult> {
  return createPositionEntry({
    kind: 'memory',
    rateLimit: RATE_LIMITS.createPosition,
    data,
    validate: (userId) =>
      validatePositionMutationData({
        fen: data.fen,
        title: data.title,
        description: data.description,
        userId,
      }),
  });
}
