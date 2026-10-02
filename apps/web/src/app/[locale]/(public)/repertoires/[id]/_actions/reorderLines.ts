'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import type { ArrangementItem } from '@/lib/repertoires/line-order';
import { saveRepertoireArrangement } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: commit the arrangement the owner built on the manage page —
 * chapters, which chapter each line is in, and the order within each. Called
 * once, from that page's Save button, with the whole list.
 *
 * No `revalidatePath`: the page `router.push`es to the repertoire detail page
 * on success, and every surface that renders the order is dynamic, so the new
 * order is on screen without purging anything. On failure the list calls
 * `router.refresh()` itself to re-read the server's arrangement.
 */
export async function reorderLines(input: {
  repertoireId: string;
  items: ArrangementItem[];
}): Promise<ActionResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.reorderRepertoireLines);
  if ('error' in guard) return { error: guard.error };
  const result = await saveRepertoireArrangement({
    repertoireId: input.repertoireId,
    items: input.items,
    viewerId: guard.user.id,
  });
  if (!result.ok) return { error: result.error };
  return { success: true };
}
