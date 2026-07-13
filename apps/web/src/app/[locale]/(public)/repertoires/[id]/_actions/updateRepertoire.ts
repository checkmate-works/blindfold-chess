'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { updateRepertoireDetails } from '@/lib/repertoires/mutations';
import type { UpdateRepertoireResult } from '@/lib/repertoires/mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: save a repertoire's title + opening links. The listing shows both
 * (the linked opening drives the thumbnail FEN), so the list is revalidated
 * alongside the detail page.
 */
export async function updateRepertoire(input: {
  repertoireId: string;
  locale: string;
  name: string;
  openingIds: string[];
}): Promise<UpdateRepertoireResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.updateRepertoire);
  if ('error' in guard) return { ok: false, error: guard.error };

  const result = await updateRepertoireDetails({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    name: input.name,
    openingIds: input.openingIds,
  });
  if (result.ok) {
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}`);
    revalidatePath(`/${input.locale}/repertoires`);
  }
  return result;
}
