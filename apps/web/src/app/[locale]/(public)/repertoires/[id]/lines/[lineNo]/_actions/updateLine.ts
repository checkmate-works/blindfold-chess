'use server';

import { authenticateAndGuard } from '@/lib/auth';
import { updateRepertoireLine } from '@/lib/repertoires/mutations';
import type { UpdateLineResult } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: save a line's edited title + moves.
 *
 * No `revalidatePath`: `EditLineForm` `router.push`es back to the line page.
 */
export async function updateLine(input: {
  repertoireId: string;
  lineNo: number;
  name: string | null;
  pgn: string;
}): Promise<UpdateLineResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.updateRepertoireLine);
  if ('error' in guard) return { ok: false, error: guard.error };
  const result = await updateRepertoireLine({
    repertoireId: input.repertoireId,
    lineNo: input.lineNo,
    viewerId: guard.user.id,
    name: input.name,
    pgn: input.pgn,
  });
  return result;
}
