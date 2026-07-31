'use server';

import { authenticateAndGuard } from '@/lib/auth';
import type { ReorderLinesResult } from '@/lib/repertoires/mutations';
import { reorderRepertoireLines } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: persist the order the owner arranged the lines in on the manage
 * page.
 *
 * No `revalidatePath`: the manage list owns the order in client state and is
 * the only surface that writes it, and every page that reads the order is
 * dynamic — so the next navigation renders the new order anyway. On failure
 * the list calls `router.refresh()` itself to snap back to the server's order.
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
