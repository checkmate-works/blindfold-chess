'use server';

import { authenticateAndGuard } from '@/lib/auth';
import { deleteRepertoireLine } from '@/lib/repertoires/mutations';
import type { DeleteLineResult } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: soft-delete a single line and repack the survivors' numbering.
 *
 * No `revalidatePath`: `RepertoireLineActionsMenu` `router.push`es to the
 * repertoire detail page, which is dynamic.
 */
export async function deleteLine(input: {
  repertoireId: string;
  lineNo: number;
}): Promise<DeleteLineResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.deleteRepertoireLine);
  if ('error' in guard) return { ok: false, error: guard.error };
  const result = await deleteRepertoireLine({
    repertoireId: input.repertoireId,
    lineNo: input.lineNo,
    viewerId: guard.user.id,
  });
  return result;
}
