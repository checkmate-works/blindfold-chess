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
// `_locale`: the positional slot is part of the signature `DeletePuzzleButton`
// calls, but nothing here reads it any more — the delete no longer builds a
// revalidation path. (Unlike its `deletePosition` sibling this entry point
// never validated the locale either, so there is nothing else to keep it for.)
export async function deletePuzzle(puzzleId: string, _locale: string): Promise<ActionResult> {
  return deletePositionEntry({
    positionId: puzzleId,
    kind: 'puzzle',
    rateLimit: RATE_LIMITS.deletePuzzle,
  });
}
