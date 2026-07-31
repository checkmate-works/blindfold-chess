'use server';

import { authenticateAndGuard } from '@/lib/auth';
import type { ReorderLinesResult } from '@/lib/repertoires/mutations';
import { reorderRepertoireLines } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: commit the order the owner arranged the lines in on the manage
 * page. Called once, from that page's Save button, with the whole list.
 *
 * No `revalidatePath`: the page `router.push`es to the repertoire detail page
 * on success, and every surface that renders the order is dynamic, so the new
 * order is on screen without purging anything. On failure the list calls
 * `router.refresh()` itself to re-read the server's order.
 */
export async function reorderLines(input: {
  repertoireId: string;
  orderedLineNos: number[];
}): Promise<ReorderLinesResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.reorderRepertoireLines);
  if ('error' in guard) return { ok: false, error: guard.error };
  return reorderRepertoireLines({
    repertoireId: input.repertoireId,
    orderedLineNos: input.orderedLineNos,
    viewerId: guard.user.id,
  });
}
