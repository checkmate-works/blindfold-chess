'use server';

import { authenticateAndGuard } from '@/lib/auth';
import type { AddLineResult } from '@/lib/repertoires/mutations';
import { addRepertoireLine } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/** Owner-only: append a new line (e.g. from a kata check's divergence) to an existing repertoire. */
export async function addLine(input: {
  repertoireId: string;
  name: string | null;
  pgn: string;
}): Promise<AddLineResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.addRepertoireLine);
  if ('error' in guard) return { ok: false, error: guard.error };
  const result = await addRepertoireLine({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    name: input.name,
    pgn: input.pgn,
  });
  return result;
}
