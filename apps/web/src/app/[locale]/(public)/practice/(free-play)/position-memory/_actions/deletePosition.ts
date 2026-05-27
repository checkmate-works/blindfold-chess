'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import type { ActionResult } from '@/lib/action-types';
import { deletePositionEntry } from '@/lib/positions/user-position-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * User-facing position-memory soft-delete.
 *
 * Restricts to `type = 'memory'` so that a puzzle id passed through this
 * entry point is rejected with `notFound`, matching the symmetric guard in
 * `deletePuzzle`. Admin-side deletion (which records a `moderation_actions`
 * row) lives separately under
 * `apps/web/src/app/admin/positions/memory/_actions/deletePosition.ts`.
 */
export async function deletePosition(positionId: string, locale: string): Promise<ActionResult> {
  assertSupportedLocale(locale);

  return deletePositionEntry({
    positionId,
    locale,
    kind: 'memory',
    rateLimit: RATE_LIMITS.deletePosition,
  });
}
