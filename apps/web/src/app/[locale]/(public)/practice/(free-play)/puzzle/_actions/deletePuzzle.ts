'use server';

import type { ActionResult } from '@/lib/action-types';
import { deletePositionEntry } from '@/lib/positions/user-position-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * User-facing puzzle soft-delete.
 *
 * Restricts to `type = 'puzzle'` so a memory position can never be removed
 * through this entry point even if a caller passes its id. Admin-side
 * deletion (which records a `moderation_actions` row) lives separately under
 * `apps/web/src/app/admin/positions/puzzle/_actions/deletePuzzle.ts`.
 */
export async function deletePuzzle(puzzleId: string, locale: string): Promise<ActionResult> {
  return deletePositionEntry({
    positionId: puzzleId,
    locale,
    kind: 'puzzle',
    rateLimit: RATE_LIMITS.deletePuzzle,
  });
}
