'use server';

import type { Side } from '@blindfold-chess/types';

import { authenticateAndGuard } from '@/lib/auth';
import { updateRepertoireDetails } from '@/lib/repertoires/mutations';
import type { UpdateRepertoireResult } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: save a repertoire's METADATA — title, description, side, and
 * opening links. The move tree is not touched here; lines are edited one at a
 * time on their own pages.
 *
 * No `revalidatePath`: `EditRepertoireForm` `router.push`es back to the detail
 * page, and both it and the listing are dynamic routes.
 */
export async function updateRepertoire(input: {
  repertoireId: string;
  name: string;
  side: Side;
  /** Course-level blurb; trimmed to null server-side when blank. */
  description: string | null;
  openingIds: string[];
}): Promise<UpdateRepertoireResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.updateRepertoire);
  if ('error' in guard) return { ok: false, error: guard.error };

  const result = await updateRepertoireDetails({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    name: input.name,
    side: input.side,
    description: input.description,
    openingIds: input.openingIds,
  });
  return result;
}
