'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { updateRepertoireLine } from '@/lib/repertoires/mutations';
import type { UpdateLineResult } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/** Owner-only: save a line's edited title + moves. */
export async function updateLine(input: {
  repertoireId: string;
  lineNo: number;
  locale: string;
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
  if (result.ok) {
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}/lines/${input.lineNo}`);
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}`);
  }
  return result;
}
