'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { addRepertoireLine } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/** Owner-only: append a new line (e.g. from a kata check's divergence) to an existing repertoire. */
export async function addLine(input: {
  repertoireId: string;
  name: string | null;
  chapterId: string | null;
  pgn: string;
}): Promise<ActionResult<{ lineNo: number }>> {
  const guard = await authenticateAndGuard(RATE_LIMITS.addRepertoireLine);
  if ('error' in guard) return { error: guard.error };
  const result = await addRepertoireLine({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    name: input.name,
    chapterId: input.chapterId,
    pgn: input.pgn,
  });
  if (!result.ok) return { error: result.error };
  return { success: true, lineNo: result.lineNo };
}
